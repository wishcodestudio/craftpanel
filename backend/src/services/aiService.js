const SYSTEM_PROMPT = `You are an expert Minecraft Java Edition server administrator. A server admin has provided an error or problem description along with some server context. Diagnose the problem and suggest fixes.

IMPORTANT: Use the provided "SERVER CONTEXT" (status, rcon_enabled, etc.) to tailor your suggestions. For example, if the server is offline, don't suggest RCON commands as the primary fix unless you also suggest starting the server.

Respond ONLY with valid JSON in exactly this format — no other text:
{
  "explanation": "<plain English explanation, 2-3 sentences>",
  "fixes": [
    {
      "title": "<short fix title>",
      "description": "<what this fix does and why it works>",
      "risk": "low",
      "actions": [
        { "type": "config", "file": "server.properties", "key": "view-distance", "value": "6", "from": "10" },
        { "type": "rcon",   "command": "say Applying performance fix" },
        { "type": "jvm",    "flag": "Xmx", "value": "4G", "from": "2G" }
      ]
    }
  ]
}

Action types — only include actions that are safe to automate:
- "config": edit a key=value line in any .properties or .yml file. Include "from" (current value) when known.
- "file": write or overwrite an ENTIRE file. Use this for complex config changes or fixing script files. Include "content" (the full new content).
- "rcon": run a server console command via RCON (no leading slash).
- "jvm": change a JVM memory flag in run.bat/run.sh. "flag" is "Xmx" or "Xms", "value" like "4G". Include "from" when known.

For steps that require manual action (downloading a plugin, etc.), describe them in "description" only — do not add them as actions.
Provide 1-3 fixes ordered safest first. risk must be exactly "low", "medium", or "high".`;

function detectProvider() {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return null;
}

function activeProvider() {
  return (process.env.AI_PROVIDER || detectProvider())?.trim();
}

// ── Anthropic ─────────────────────────────────────────────────────────────
let anthropicClient = null;
async function analyzeWithAnthropic(errorText) {
  if (!anthropicClient) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });
  }
  const modelName = process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-sonnet-20240620';
  const response = await anthropicClient.messages.create({
    model: modelName,
    max_tokens: 1200,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: errorText.slice(0, 4000) }],
  });
  return response.content[0]?.text || '';
}

// ── Gemini ────────────────────────────────────────────────────────────────
let geminiModel = null; // reset whenever SYSTEM_PROMPT changes
async function analyzeWithGemini(errorText) {
  const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';
  if (!geminiModel) {
    console.log(`[AI] Initializing Gemini with model: "${modelName}"`);
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
    geminiModel = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
    });
  }
  const result = await geminiModel.generateContent(errorText.slice(0, 4000));
  return result.response.text();
}

// ── OpenAI ────────────────────────────────────────────────────────────────
let openaiClient = null;
async function analyzeWithOpenAI(errorText) {
  if (!openaiClient) {
    const OpenAI = require('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY?.trim() });
  }
  const modelName = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const response = await openaiClient.chat.completions.create({
    model: modelName,
    max_tokens: 1200,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: errorText.slice(0, 4000) },
    ],
  });
  return response.choices[0]?.message?.content || '';
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function withRetry(fn, maxRetries = 2, delay = 1000) {
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const isTransient = e.message?.includes('503') || e.message?.includes('high demand') || e.message?.includes('429');
      if (!isTransient || i === maxRetries) break;
      console.warn(`[AI] Transient error (attempt ${i + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw lastErr;
}

// ── Router ────────────────────────────────────────────────────────────────
function parseResponse(raw) {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  if (!parsed.explanation || !Array.isArray(parsed.fixes)) throw new Error('bad shape');
  return parsed;
}

async function analyzeError(errorText, serverContext = {}) {
  const primaryProvider = activeProvider();
  if (!primaryProvider) {
    throw Object.assign(
      new Error('No AI API key configured. Set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in .env'),
      { code: 'AI_001', status: 502 }
    );
  }

  // Define providers in order of preference (primary first, then others if keys exist)
  const allProviders = [
    primaryProvider,
    ...['gemini', 'anthropic', 'openai'].filter(p => p !== primaryProvider && (
      (p === 'gemini' && process.env.GEMINI_API_KEY) ||
      (p === 'anthropic' && process.env.ANTHROPIC_API_KEY) ||
      (p === 'openai' && process.env.OPENAI_API_KEY)
    ))
  ];

  const contextStr = Object.entries(serverContext)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const fullPrompt = contextStr 
    ? `--- SERVER CONTEXT ---\n${contextStr}\n\n--- ERROR / PROBLEM ---\n${errorText}`
    : errorText;

  let lastError;
  for (const provider of allProviders) {
    try {
      const raw = await withRetry(async () => {
        if (provider === 'anthropic') return await analyzeWithAnthropic(fullPrompt);
        if (provider === 'gemini') return await analyzeWithGemini(fullPrompt);
        if (provider === 'openai') return await analyzeWithOpenAI(fullPrompt);
        throw new Error(`Unknown provider: ${provider}`);
      });
      return { ...parseResponse(raw), provider };
    } catch (e) {
      console.error(`[AI] Provider ${provider} failed: ${e.message}`);
      lastError = e;
      // If it's a configuration error (AI_001), don't bother trying other providers
      if (e.code === 'AI_001') break;
    }
  }

  throw Object.assign(
    new Error(`AI service unavailable. Last error (${allProviders[allProviders.length-1]}): ${lastError.message}`),
    { code: 'AI_003', status: 502 }
  );
}

module.exports = { analyzeError, activeProvider, detectProvider };
