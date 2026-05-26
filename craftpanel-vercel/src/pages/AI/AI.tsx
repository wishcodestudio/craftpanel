import { useState } from 'react';
import { useAnalyzeLogMutation, useGetServersQuery } from '../../store/api/craftpanelApi';
import type { AIAnalysis, AISeverity } from '../../types';
import styles from './AI.module.css';

const EXAMPLES = [
  {
    label: 'OutOfMemory crash',
    log: `[ERROR]: Exception in server tick loop\njava.lang.OutOfMemoryError: Java heap space\n\tat java.base/java.util.Arrays.copyOf(Arrays.java:3746)\n\tat net.minecraft.server.level.ServerLevel.saveAllChunks(ServerLevel.java:412)\n\tat net.minecraft.server.MinecraftServer.saveEverything(MinecraftServer.java:501)\nCaused by: java.lang.OutOfMemoryError: GC overhead limit exceeded`,
  },
  {
    label: 'TPS lag spike',
    log: `[WARN]: Can't keep up! Is the server overloaded? Running 2003ms or 40 ticks behind\n[WARN]: Can't keep up! Is the server overloaded? Running 3105ms or 62 ticks behind\n[WARN]: Can't keep up! Is the server overloaded? Running 5102ms or 102 ticks behind\n[INFO]: TPS from last 1m, 5m, 15m: 12.4, 14.1, 18.2`,
  },
  {
    label: 'Port bind error',
    log: `[ERROR]: Failed to start the minecraft server\njava.net.BindException: Address already in use: bind\n\tat sun.nio.ch.Net.bind0(Native Method)\n\tat sun.nio.ch.Net.bind(Net.java:461)\n\tat sun.nio.ch.ServerSocketChannelImpl.bind(ServerSocketChannelImpl.java:223)\nCould not bind to port 25565`,
  },
  {
    label: 'Entity crash',
    log: `[ERROR]: Encountered an unexpected exception\nnet.minecraft.server.level.ServerLevel$1: Exception ticking entity\n\tat net.minecraft.server.level.ServerLevel.tickNonPassenger(ServerLevel.java:788)\nCaused by: java.lang.NullPointerException: Cannot invoke method getLocation()\n\tat com.example.plugin.EntityListener.onTick(EntityListener.java:47)`,
  },
];

const SEVERITY_LABELS: Record<AISeverity, string> = {
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
};

export default function AI() {
  const [log, setLog] = useState('');
  const [serverId, setServerId] = useState('');
  const [result, setResult] = useState<AIAnalysis | null>(null);
  const [history, setHistory] = useState<Array<{ log: string; result: AIAnalysis; time: string }>>([]);
  const [analyzeLog, { isLoading }] = useAnalyzeLogMutation();
  const { data: servers = [] } = useGetServersQuery();

  const handleAnalyze = async () => {
    if (!log.trim()) return;
    try {
      const res = await analyzeLog({ log, serverId: serverId || undefined }).unwrap();
      setResult(res);
      setHistory(h => [{ log, result: res, time: new Date().toLocaleTimeString() }, ...h.slice(0, 9)]);
    } catch {
      // error handled by RTK Query
    }
  };

  const loadExample = (ex: typeof EXAMPLES[0]) => {
    setLog(ex.log);
    setResult(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.heading}>AI Diagnostics</h1>
          <p className={styles.subtitle}>Paste server logs or error output for instant AI analysis</p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.inputPanel}>
          <div className={styles.panelHeader}>
            <span>Log Input</span>
            <select
              className={styles.serverSelect}
              value={serverId}
              onChange={e => setServerId(e.target.value)}
            >
              <option value="">No server context</option>
              {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className={styles.examples}>
            {EXAMPLES.map(ex => (
              <button key={ex.label} className={styles.exampleBtn} onClick={() => loadExample(ex)}>
                {ex.label}
              </button>
            ))}
          </div>

          <textarea
            className={styles.logInput}
            value={log}
            onChange={e => setLog(e.target.value)}
            placeholder={`Paste your server log or error output here...\n\nExample:\n[ERROR]: java.lang.OutOfMemoryError: Java heap space\n\tat net.minecraft.server...`}
            spellCheck={false}
          />

          <div className={styles.analyzeRow}>
            <span className={styles.charCount}>{log.length} chars</span>
            <button
              className={styles.analyzeBtn}
              onClick={handleAnalyze}
              disabled={isLoading || !log.trim()}
            >
              {isLoading ? (
                <span className={styles.analyzing}>
                  <span className={styles.dot} />
                  Analyzing...
                </span>
              ) : 'Analyze with AI'}
            </button>
          </div>
        </div>

        <div className={styles.resultPanel}>
          {isLoading && (
            <div className={styles.thinking}>
              <div className={styles.thinkingDots}>
                <span /><span /><span />
              </div>
              <p>AI is analyzing your logs...</p>
            </div>
          )}

          {!isLoading && result && (
            <div className={styles.analysis}>
              <div className={styles.analysisHeader}>
                <div className={`${styles.severityBadge} ${styles[result.severity]}`}>
                  {SEVERITY_LABELS[result.severity]}
                </div>
                <div className={styles.confidence}>
                  Confidence: {result.confidence}%
                  <div className={styles.confBar}>
                    <div className={styles.confFill} style={{ width: `${result.confidence}%` }} />
                  </div>
                </div>
              </div>

              <h3 className={styles.summary}>{result.summary}</h3>

              <div className={styles.section}>
                <h4>Root Cause</h4>
                <p>{result.rootCause}</p>
              </div>

              <div className={styles.section}>
                <h4>Recommended Fixes</h4>
                <div className={styles.fixes}>
                  {result.fixes.map((fix, i) => (
                    <div key={i} className={styles.fix}>
                      <div className={styles.fixHeader}>
                        <span className={`${styles.fixType} ${styles['fix_' + fix.type]}`}>{fix.type}</span>
                        <span className={styles.fixDesc}>{fix.description}</span>
                      </div>
                      {fix.action && (
                        <pre className={styles.fixCode}>{fix.action}</pre>
                      )}
                      {fix.file && fix.key && (
                        <div className={styles.fixConfig}>
                          <span className={styles.mono}>{fix.file}</span>
                          <span className={styles.arrow}>→</span>
                          <span className={styles.mono}>{fix.key} = {fix.value}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <h4>Prevention</h4>
                <p>{result.prevention}</p>
              </div>
            </div>
          )}

          {!isLoading && !result && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>[AI]</div>
              <p>Submit a log to receive an AI-powered diagnosis</p>
              <p className={styles.emptyHint}>Works on OutOfMemory errors, lag spikes, crashes, port conflicts, plugin errors, and more</p>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className={styles.historyPanel}>
          <div className={styles.panelHeader}><span>Analysis History</span></div>
          <div className={styles.historyList}>
            {history.map((h, i) => (
              <div key={i} className={styles.historyItem} onClick={() => { setLog(h.log); setResult(h.result); }}>
                <span className={`${styles.severityDot} ${styles[h.result.severity]}`} />
                <span className={styles.histSummary}>{h.result.summary}</span>
                <span className={styles.histTime}>{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
