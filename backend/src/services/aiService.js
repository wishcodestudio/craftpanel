const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT = `You are an expert Minecraft Java Edition server administrator with deep knowledge of plugins, Skript scripting, and server management. A server admin has provided an error or problem description along with server context. Diagnose the problem and suggest fixes.

IMPORTANT: Use the provided "SERVER CONTEXT" (status, rcon_enabled, installed plugins, Skript scripts, etc.) to tailor your suggestions. For example, if the server is offline, don't suggest RCON commands as the primary fix unless you also suggest starting the server.

=== SKRIPT SCRIPTING ===
When working with Skript scripts (.sk files):
- Scripts live in: plugins/Skript/scripts/<filename>.sk
- Files prefixed with "-" are disabled (e.g. "-example.sk")
- Use "file" actions to create or overwrite entire .sk files
- Basic Skript structure:
    command /<name> [<args>]:
        trigger:
            <effects>
    on <event>:
        <conditions>
        <effects>
- Common effects: send "<msg>" to player, execute console command "/<cmd>", give player <item>, teleport player to {variable}
- Variables: {var} (global), {_var} (local), {var::%player%} (per-player)
- To call CMI from Skript: execute console command "cmi heal %player%"
- To call CMI from Skript for another player: execute console command "cmi <cmd> %name of target%"
- skript-reflect addon is installed: allows Java reflection for advanced usage

=== CMI PLUGIN COMMANDS ===
CMI is installed. When suggesting RCON commands or Skript console commands, use these CMI commands:
Player management: cmi heal [player], cmi feed [player], cmi fly [player], cmi god [player], cmi vanish [player]
Teleport: cmi tp <player>, cmi tpa <player>, cmi tpahere <player>, cmi spawn, cmi back, cmi home [name]
Homes/Warps: cmi sethome [name], cmi delhome [name], cmi warp [name], cmi setwarp [name], cmi delwarp [name]
Economy: cmi money <player>, cmi givemoney <player> <amount>, cmi takemoney <player> <amount>
Moderation: cmi ban <player> [reason], cmi unban <player>, cmi kick <player> [reason], cmi mute <player>, cmi unmute <player>, cmi jail <player>, cmi warn <player> <reason>
Info: cmi info <player>, cmi playtime <player>, cmi inv <player>, cmi enderchest <player>
Misc: cmi gamemode <survival|creative|adventure|spectator> [player], cmi kit <name> [player], cmi repair [hand|all], cmi workbench, cmi iteminfo, cmi enchant <enchantment> [level]

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
        { "type": "jvm",    "flag": "Xmx", "value": "4G", "from": "2G" },
        { "type": "file",   "file": "plugins/Skript/scripts/example.sk", "content": "# full file content here" }
      ]
    }
  ]
}

Action types — only include actions that are safe to automate:
- "config": edit a key=value line in any .properties or .yml file. Include "from" (current value) when known.
- "file": write or overwrite an ENTIRE file. Use this for Skript scripts (.sk files) or complex config changes. "file" path is relative to server root (e.g. "plugins/Skript/scripts/heal.sk"). Include "content" with full new file content. When editing existing Skript scripts shown in context, preserve their existing structure and Thai comments.
- "rcon": run a server console command via RCON (no leading slash). Use CMI commands when the CMI plugin is installed.
- "jvm": change a JVM memory flag in run.bat/run.sh. "flag" is "Xmx" or "Xms", "value" like "4G". Include "from" when known.

For steps that require manual action (downloading a plugin, etc.), describe them in "description" only — do not add them as actions.
Provide 1-3 fixes ordered safest first. risk must be exactly "low", "medium", or "high".`;

const PLUGIN_KEYWORDS = ['skript', '[skript]', '.sk', 'plugin', 'cmi', 'citizens', 'script error', 'could not load', 'hook', 'bukkit', 'paper', 'spigot'];

async function buildPluginContext(serverDir, errorText) {
  if (!serverDir) return '';
  const lower = errorText.toLowerCase();
  const isPluginRelated = PLUGIN_KEYWORDS.some(kw => lower.includes(kw));
  if (!isPluginRelated) return '';

  let context = '\n\n=== INSTALLED PLUGINS ===\n';

  try {
    const pluginsDir = path.join(serverDir, 'plugins');
    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    const plugins = entries
      .filter(e => e.isDirectory() || e.name.endsWith('.jar'))
      .map(e => e.name.replace(/\.jar$/, ''));
    context += plugins.join(', ') + '\n';
  } catch {
    return '';
  }

  const isSkriptRelated = lower.includes('skript') || lower.includes('.sk') || lower.includes('script');
  if (isSkriptRelated) {
    const scriptsDir = path.join(serverDir, 'plugins', 'Skript', 'scripts');
    try {
      const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.sk') && !f.startsWith('-'));
      if (files.length > 0) {
        context += '\n=== SKRIPT SCRIPTS (active) ===\n';
        for (const file of files.slice(0, 8)) {
          try {
            const raw = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
            context += `\n--- ${file} ---\n${raw.slice(0, 3000)}\n`;
          } catch {}
        }
      }
    } catch {}
  }

  return context;
}

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
    max_tokens: 2500,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: errorText.slice(0, 8000) }],
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
  const result = await geminiModel.generateContent(errorText.slice(0, 8000));
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
    max_tokens: 2500,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: errorText.slice(0, 8000) },
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

const VALID_PROVIDERS = ['anthropic', 'gemini', 'openai'];

function hasKey(p) {
  if (p === 'anthropic') return !!process.env.ANTHROPIC_API_KEY;
  if (p === 'gemini')    return !!process.env.GEMINI_API_KEY;
  if (p === 'openai')    return !!process.env.OPENAI_API_KEY;
  return false;
}

async function analyzeError(errorText, serverContext = {}, serverDir = null, preferredProvider = null) {
  const configuredPrimary = activeProvider();
  if (!configuredPrimary) {
    throw Object.assign(
      new Error('No AI API key configured. Set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in .env'),
      { code: 'AI_001', status: 502 }
    );
  }

  // Use user-selected provider if it's valid and has a key, otherwise fall back to env-configured primary
  const effectivePrimary = (
    preferredProvider &&
    VALID_PROVIDERS.includes(preferredProvider) &&
    hasKey(preferredProvider)
  ) ? preferredProvider : configuredPrimary;

  // Build ordered list: preferred first, then the rest that have keys
  const allProviders = [
    effectivePrimary,
    ...VALID_PROVIDERS.filter(p => p !== effectivePrimary && hasKey(p)),
  ];

  const contextStr = Object.entries(serverContext)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const pluginContext = await buildPluginContext(serverDir, errorText);

  const fullPrompt = contextStr
    ? `--- SERVER CONTEXT ---\n${contextStr}${pluginContext}\n\n--- ERROR / PROBLEM ---\n${errorText}`
    : `${pluginContext ? pluginContext + '\n\n' : ''}${errorText}`;

  let lastError;
  for (const provider of allProviders) {
    try {
      const raw = await withRetry(async () => {
        if (provider === 'anthropic') return await analyzeWithAnthropic(fullPrompt);
        if (provider === 'gemini') return await analyzeWithGemini(fullPrompt);
        if (provider === 'openai') return await analyzeWithOpenAI(fullPrompt);
        throw new Error(`Unknown provider: ${provider}`);
      });
      return { ...parseResponse(raw), provider, requestedProvider: preferredProvider || 'auto' };
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
