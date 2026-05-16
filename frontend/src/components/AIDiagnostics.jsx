import { useEffect, useState } from 'react';
import api from '../lib/api';

function ActionBadge({ action }) {
  const styles = {
    config: { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.3)',  color: '#60a5fa', icon: '⚙' },
    rcon:   { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)',  color: '#4ade80', icon: '▶' },
    jvm:    { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  color: '#fbbf24', icon: '☕' },
  };
  const s = styles[action.type] || styles.config;

  let label = '';
  if (action.type === 'config') {
    label = `${action.file}  →  ${action.key} = ${action.value}`;
    if (action.from) label = `${action.file}  →  ${action.key}: ${action.from} → ${action.value}`;
  } else if (action.type === 'rcon') {
    label = `run: ${action.command}`;
  } else if (action.type === 'jvm') {
    label = action.from
      ? `-${action.flag}: ${action.from} → ${action.value}`
      : `-${action.flag} = ${action.value}`;
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 10px', borderRadius: 6, marginBottom: 4,
      background: s.bg, border: `1px solid ${s.border}`,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
    }}>
      <span style={{ color: s.color, fontWeight: 700 }}>{s.icon} {action.type.toUpperCase()}</span>
      <span style={{ color: 'var(--text2)' }}>{label}</span>
    </div>
  );
}

function ResultRow({ r }) {
  const ok = r.status === 'ok';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0',
      borderBottom: '1px solid rgba(46,52,80,0.4)', fontSize: 12,
    }}>
      <span style={{ color: ok ? 'var(--green)' : 'var(--red)', fontWeight: 700, flexShrink: 0 }}>
        {ok ? '✓' : '✗'}
      </span>
      <div style={{ flex: 1 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>
          {r.action.type === 'config' && `${r.action.file}: ${r.action.key} = ${r.action.value}`}
          {r.action.type === 'rcon'   && `run: ${r.action.command}`}
          {r.action.type === 'jvm'    && `-${r.action.flag} = ${r.action.value}`}
        </span>
        {!ok && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 2 }}>{r.error}</div>}
        {ok && r.detail?.output && (
          <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>{r.detail.output}</div>
        )}
        {ok && r.detail?.warning && (
          <div style={{ color: 'var(--amber)', fontSize: 11, marginTop: 2 }}>⚠ {r.detail.warning}</div>
        )}
        {ok && r.detail?.changed === false && (
          <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>already set — no change needed</div>
        )}
      </div>
    </div>
  );
}

const PROVIDERS = [
  { id: 'auto',      label: 'Auto' },
  { id: 'anthropic', label: 'Claude' },
  { id: 'gemini',    label: 'Gemini' },
  { id: 'openai',    label: 'OpenAI' },
];

const PROVIDER_LABELS = { anthropic: 'Claude', gemini: 'Gemini', openai: 'OpenAI', auto: 'Auto' };

export default function AIDiagnostics({ serverId, prefillText, historyResult, serverName }) {
  const [input,        setInput]        = useState(prefillText || '');
  const [thinking,     setThinking]     = useState(false);
  const [result,       setResult]       = useState(historyResult || null);
  const [selected,     setSelected]     = useState(null);
  const [applyModal,   setApplyModal]   = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResults, setApplyResults] = useState(null);
  const [provider,     setProvider]     = useState(() => localStorage.getItem('cp_ai_provider') || 'auto');

  const selectProvider = (p) => {
    setProvider(p);
    localStorage.setItem('cp_ai_provider', p);
  };

  useEffect(() => {
    if (prefillText !== undefined) {
      setInput(prefillText || '');
    }
    if (historyResult) {
      setResult(historyResult);
    } else if (prefillText) {
      setResult(null);
    }
    setSelected(null);
    setApplyResults(null);
  }, [prefillText, historyResult]);

  const analyze = async () => {
    if (!input.trim() || !serverId) return;
    setThinking(true);
    setResult(null);
    setSelected(null);
    setApplyResults(null);
    try {
      const r = await api.post('/ai/analyze', {
        serverId,
        errorText: input,
        ...(provider !== 'auto' && { provider }),
      });
      setResult(r.data.data);
    } catch (e) {
      setResult({
        explanation: e.response?.data?.error?.message || 'AI service error. Check your API key in .env',
        fixes: [],
      });
    }
    setThinking(false);
  };

  const confirmApply = async () => {
    const fix = applyModal;
    setApplyModal(null);
    setApplyLoading(true);
    setApplyResults(null);
    try {
      const r = await api.post('/ai/apply', { serverId, fix });
      setApplyResults(r.data.data.results);
    } catch (e) {
      setApplyResults([{
        action: { type: 'error' },
        status: 'error',
        error: e.response?.data?.error?.message || e.message,
      }]);
    }
    setApplyLoading(false);
  };

  const riskClass = (r) => ({ low: 'risk-low', medium: 'risk-med', high: 'risk-high' }[r] || 'risk-low');

  return (
    <div>
      {/* ── Confirm modal ── */}
      {applyModal && (
        <div className="modal-bg">
          <div className="modal" style={{ width: 480 }}>
            <div className="modal-title">Apply Fix to {serverName}</div>
            <div className="modal-body" style={{ marginBottom: 12 }}>{applyModal.description}</div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
                             color: 'var(--text3)', marginBottom: 8 }}>
                Actions that will run:
              </div>
              {(applyModal.actions || []).map((a, i) => <ActionBadge key={i} action={a} />)}
              {(!applyModal.actions?.length) && (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>No automated actions — manual steps only.</div>
              )}
            </div>

            {applyModal.risk !== 'low' && (
              <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.1)',
                             border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8,
                             fontSize: 12, color: 'var(--amber)', marginBottom: 12 }}>
                ⚠ Risk level: {applyModal.risk} — a backup (.bak) will be made before any file changes.
              </div>
            )}

            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setApplyModal(null)}>Cancel</button>
              <button className="modal-confirm" onClick={confirmApply}
                      disabled={!applyModal.actions?.length}>
                {applyModal.actions?.length ? 'Apply Now' : 'No actions to run'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ai-layout">
        {/* ── Left: Input ── */}
        <div className="ai-panel">
          <div className="panel-header">
            <span className="panel-title">Error / Problem</span>
            <div className="provider-selector">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  className={`provider-btn ${provider === p.id ? 'active' : ''}`}
                  onClick={() => selectProvider(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {result && result.requestedProvider && result.requestedProvider !== 'auto' &&
           result.provider !== result.requestedProvider && (
            <div className="provider-fallback-notice">
              ⚡ {PROVIDER_LABELS[result.requestedProvider]} unavailable — used {PROVIDER_LABELS[result.provider]} instead
            </div>
          )}
          <div className="ai-input-area">
            <textarea
              className="ai-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Paste a log error or describe a problem…\n\nExample:\njava.lang.OutOfMemoryError: Java heap space`}
            />
            <button
              className="ai-submit-btn"
              onClick={analyze}
              disabled={!input.trim() || thinking || !serverId}
            >
              {thinking ? 'Analyzing…' : 'Analyze with AI →'}
            </button>
          </div>

          {/* Apply results */}
          {applyResults && (
            <div style={{ margin: '0 16px 16px', padding: 14,
                           background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text1)' }}>
                Apply Results
              </div>
              {applyResults.map((r, i) => <ResultRow key={i} r={r} />)}
              {applyResults.some((r) => r.action?.type === 'config' || r.action?.type === 'jvm') && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)' }}>
                  💡 .bak backup files were created before each file change. Restart the server for changes to take effect.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Suggestions ── */}
        <div className="ai-panel">
          <div className="panel-header">
            <span className="panel-title">AI Suggestions</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {result?.provider && (
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                  ⬡ {PROVIDER_LABELS[result.provider] || result.provider}
                </span>
              )}
              {historyResult && result === historyResult && (
                <span style={{ fontSize: 11, background: 'rgba(96,165,250,0.1)', color: '#60a5fa',
                               padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  HISTORY
                </span>
              )}
            </div>
          </div>

          {thinking && (
            <div className="ai-thinking">
              <div className="thinking-dots"><span>·</span><span>·</span><span>·</span></div>
              Analyzing with AI…
            </div>
          )}

          {!result && !thinking && (
            <div className="empty-state" style={{ height: 300 }}>
              <div className="empty-icon">🤖</div>
              <div className="empty-text">Paste an error and click Analyze</div>
            </div>
          )}

          {result && !thinking && (
            <div className="ai-response">
              <div className="ai-explanation">{result.explanation}</div>

              {result.fixes?.map((fix, i) => (
                <div
                  key={i}
                  className={`fix-option ${selected === i ? 'selected' : ''}`}
                  onClick={() => { setSelected(i); setApplyResults(null); }}
                >
                  <div className="fix-num">Fix {i + 1}</div>
                  <div className="fix-title">{fix.title}</div>
                  <div className="fix-desc">{fix.description}</div>

                  {/* Actions preview */}
                  {fix.actions?.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      {fix.actions.map((a, j) => <ActionBadge key={j} action={a} />)}
                    </div>
                  )}
                  {!fix.actions?.length && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                      Manual steps only — no automated actions
                    </div>
                  )}

                  <div className={`fix-risk ${riskClass(fix.risk)}`} style={{ marginTop: 8 }}>
                    {fix.risk === 'low' ? '✓ Low risk' : fix.risk === 'medium' ? '⚠ Medium risk' : '⛔ High risk'}
                  </div>
                </div>
              ))}

              {selected !== null && result.fixes?.[selected] && (
                <button
                  className="apply-btn"
                  onClick={() => setApplyModal(result.fixes[selected])}
                  disabled={applyLoading}
                >
                  {applyLoading
                    ? 'Applying…'
                    : result.fixes[selected].actions?.length
                    ? `Apply Fix ${selected + 1} →`
                    : 'Manual fix only — see description'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
