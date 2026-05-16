# CraftPanel — AI-Powered Minecraft Server Management Panel

## Abstract

CraftPanel is a self-hostable, web-based control panel for managing Minecraft Java Edition servers. It provides server administrators with a unified interface for real-time console access, configuration file editing, live log monitoring, and AI-assisted error diagnostics. The key innovation is an integrated AI diagnostic engine that analyzes server errors, proposes structured fixes, and applies them automatically — reducing the technical barrier for non-expert administrators.

---

## 1. Background & Problem Statement

Minecraft remains one of the most widely deployed multiplayer game servers, used by student communities, small organizations, and hobbyist groups worldwide. Despite this, server administration remains fragmented and technically demanding:

- **Console access** requires SSH or direct terminal access to the host machine.
- **Configuration editing** is done manually over FTP or SCP with no syntax assistance.
- **Error diagnosis** depends on manually reading log files and searching forums, a process that is slow and error-prone for non-experts.
- **Existing panels** (e.g., Pterodactyl, AMP) provide basic management capabilities but lack integrated AI-assisted troubleshooting, leaving administrators to diagnose and fix errors without structured guidance.

CraftPanel addresses all of these pain points in a single, self-hostable application targeting small-to-medium Minecraft server administrators and student-run communities.

---

## 2. Objectives

1. Provide a single-pane-of-glass web UI covering all common server administration tasks.
2. Enable non-expert administrators to diagnose and apply fixes for server errors through an AI-powered diagnostic engine.
3. Support role-based multi-server access control, allowing different users to manage different server groups.
4. Deliver a production-ready, self-hostable system with a guided first-run setup wizard.
5. Maintain real-time responsiveness for console output and log streaming via WebSockets.

---

## 3. System Architecture

CraftPanel follows a standard three-tier architecture:

```
[Browser]  ←→  [React 18 Frontend (Vite)]
                        ↕ HTTP REST + WebSocket (socket.io)
              [Node.js / Express Backend]
                        ↕
              [PostgreSQL 16 Database]
```

### 3.1 Frontend

The frontend is a single-page React 18 application built with Vite. Key libraries:

- **xterm.js** — Browser-side terminal emulator with ANSI color rendering.
- **Monaco Editor** — VS Code's editor component for syntax-highlighted file editing.
- **socket.io-client** — Persistent WebSocket connection for real-time console output and log streaming.
- **axios** — HTTP client for REST API calls.

### 3.2 Backend

The backend is a Node.js Express server with socket.io for bidirectional real-time communication. Key services:

- **serverProcess** — Spawns and manages Minecraft server processes via `node-pty` (pseudo-terminal), enabling ANSI passthrough and process lifecycle management (start, stop, restart).
- **rconClient** — Implements the RCON protocol over TCP for sending commands to running servers without attaching to the process stdin.
- **logWatcher** — Uses `chokidar` to watch `latest.log` for new lines, parses the Minecraft log format, and streams events to connected clients.
- **aiService** — Calls the configured AI provider (Anthropic Claude, Google Gemini, or OpenAI), parses structured JSON fix proposals, and handles prompt caching for efficiency.
- **fileManager** — Provides safe file operations (list, read, write, delete) with server-side path normalization to prevent directory traversal attacks.

### 3.3 Database

PostgreSQL 16 (deployed via Docker) stores:

| Table | Purpose |
|-------|---------|
| `users` | Admin accounts (username, bcrypt-hashed password, role) |
| `server_groups` | Logical groupings of servers |
| `servers` | Individual server configs (path, IP, RCON credentials, Minecraft version) |
| `user_group_access` | RBAC mapping: which users can manage which groups |
| `activity_log` | Audit trail of all user actions |

### 3.4 Real-time Communication

Two socket.io namespaces handle real-time events:

- **Terminal** (`terminal.js`) — Streams process stdout to the browser terminal; relays stdin commands back to the server process or RCON.
- **Logs** (`logs.js`) — Streams new log lines as they are written; sends a backfill of recent lines on client reconnect.

For reference, see the included architecture diagram (`craftpanel_folder_and_setup_flow.svg`) and sequence diagrams (`CraftPanel-All-Sequences.puml`, `CraftPanel-AI-Sequence.puml`).

---

## 4. Features

### 4.1 Authentication & Role-Based Access Control

Users log in with a username and password. The backend verifies credentials against bcrypt-hashed records and issues a signed JWT. The token encodes the user's accessible server groups, so every subsequent API request is authorized without additional database lookups. Sessions persist across page refreshes via localStorage token storage.

Access hierarchy: **User → Group → Server**. A user may belong to multiple groups, each containing one or more servers.

### 4.2 Dashboard

The dashboard is the primary landing page after login. It shows:

- **Live server statistics** — player count, max players, and TPS (ticks per second), polled every 10 seconds via RCON.
- **Live log feed** — the last N lines from `latest.log`, streamed in real time. Error lines are highlighted and include a **"→ AI"** button that pre-fills the AI Diagnostics page with the offending error text.
- **Activity feed** — a chronological list of recent user actions pulled from the activity log.

### 4.3 Interactive Terminal

A full terminal emulator powered by xterm.js renders the Minecraft server console with accurate ANSI color support. Administrators can:

- **Start, Stop, and Restart** the server with dedicated control buttons.
- **Send commands** directly to the server process (via stdin or RCON depending on server state).
- **Resize the terminal pane** — the frontend sends resize events to the backend's node-pty instance so line wrapping stays accurate.

### 4.4 File Manager

A two-panel file manager allows browsing the server's directory tree and editing files without leaving the browser:

- **Directory browser** — lists files and folders; supports navigation, file creation, folder creation, and deletion.
- **Monaco Editor** — opens selected files in a syntax-highlighted editor. Supports `.properties`, `.yml`, `.json`, `.txt`, and other common config formats.
- **Save** writes changes back to disk via the backend REST API. All write operations are validated server-side to prevent path traversal.

### 4.5 AI Diagnostics

The AI Diagnostics module is CraftPanel's primary differentiator. The workflow:

1. **Input** — The administrator pastes an error message or clicks "→ AI" from the dashboard log to auto-fill the error field.
2. **Analysis** — The backend sends the error text to the configured AI provider (Anthropic Claude by default, with Google Gemini and OpenAI as fallbacks). The prompt instructs the model to return a structured JSON response containing an explanation and one or more fix proposals.
3. **Fix proposal** — Each proposal includes: a human-readable description, a risk assessment (low / medium / high), and a list of concrete actions (config file edits, RCON commands, or JVM flag changes).
4. **Apply** — The administrator reviews the proposal and clicks "Apply Fix." The backend executes the actions in sequence. Results are logged to the activity log.

Anthropic Claude integration uses prompt caching to reduce API costs for repeated system prompt segments.

### 4.6 Activity Log

Every significant user action is recorded:

- Login and logout events
- Server start, stop, restart
- File edits (filename recorded)
- AI analyses (error text excerpt recorded)
- AI fixes applied (fix description recorded)

Logs are viewable globally (all servers) or filtered by individual server. Each entry shows the username, action type, affected server, and timestamp.

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend framework | React 18 + Vite | SPA with fast HMR dev experience |
| Terminal emulator | xterm.js | ANSI-accurate in-browser terminal |
| Code editor | Monaco Editor | Syntax-highlighted config file editing |
| WebSocket client | socket.io-client | Real-time console and log streaming |
| HTTP client | axios | REST API calls with JWT headers |
| Backend runtime | Node.js + Express | REST API server |
| Real-time server | socket.io | Bidirectional WebSocket communication |
| Pseudo-terminal | node-pty | ANSI passthrough, process lifecycle management |
| Log watching | chokidar | Efficient file-system event watching |
| RCON | Custom TCP client | Minecraft RCON protocol implementation |
| AI (primary) | Anthropic Claude API | Error analysis with prompt caching |
| AI (fallback 1) | Google Gemini API | Secondary AI provider |
| AI (fallback 2) | OpenAI API | Tertiary AI provider |
| Database | PostgreSQL 16 | Persistent storage, RBAC, audit log |
| Container | Docker Compose | PostgreSQL deployment |
| Auth | JWT + bcrypt | Stateless session tokens, password hashing |

---

## 6. Key Technical Challenges & Solutions

### 6.1 Real-time Log Streaming with Reconnect Recovery

**Challenge:** WebSocket connections drop on page refresh or network interruption. Reconnecting clients would miss log lines emitted while disconnected.

**Solution:** The `logWatcher` service maintains an in-memory ring buffer of the last N log lines. On client reconnect, a `log:backfill` event sends the buffered lines before streaming resumes. New lines are emitted as `log:line` events via chokidar's `add`/`change` hooks on `latest.log`.

### 6.2 ANSI Color Rendering in the Browser

**Challenge:** Minecraft server output contains raw ANSI escape sequences. Browsers cannot render these natively.

**Solution:** `node-pty` on the backend spawns the server process inside a pseudo-terminal, which preserves escape sequences as-is. The frontend uses xterm.js, which parses and renders ANSI sequences correctly, including color, bold, and cursor movements.

### 6.3 Safe AI Fix Application

**Challenge:** Automatically applying AI-generated changes to server configuration files carries a risk of corrupting the configuration if the model returns incorrect content.

**Solution:** The AI is prompted to return a structured JSON response with a `risk` field (`low` / `medium` / `high`) and discrete `actions` (rather than free-form file rewrites). The frontend displays the risk level and action list before the administrator confirms. File-write actions only replace specific key-value pairs, not entire files, minimizing blast radius.

### 6.4 Path Traversal Prevention

**Challenge:** The file manager API accepts user-provided file paths. A malicious path like `../../etc/passwd` could read or overwrite sensitive host files.

**Solution:** The `fileManager` service normalizes all incoming paths and clamps them to the configured server root directory. Any path that resolves outside the root is rejected with a 403 error before any I/O occurs.

---

## 7. Future Work

- **Plugin marketplace browser** — Browse, install, and update Bukkit/Spigot/Paper plugins from within the panel.
- **Scheduled backups** — Automated world and config backups with configurable retention policies.
- **Automated restart policies** — Schedule restarts and define restart triggers (crash detection, memory thresholds).
- **Player management UI** — Ban, whitelist, and op players via a structured RCON interface without typing raw commands.
- **Multi-node deployment** — Manage remote servers over SSH rather than requiring co-location on the same host.
- **Mobile-responsive UI** — Optimize the layout for tablet and mobile viewports.
- **Webhook notifications** — Notify Discord or Slack on server crash, player join milestones, or AI fix applied.

---

## 8. Conclusion

CraftPanel delivers a cohesive, AI-assisted Minecraft server management experience that eliminates the need for fragmented external tools. By combining real-time terminal emulation, in-browser file editing, live log monitoring, and an AI diagnostic engine into a single self-hostable application, CraftPanel lowers the administrative barrier for non-expert operators while retaining the depth required by experienced administrators.

From an academic standpoint, the project demonstrates the integration of several modern web engineering concepts: real-time full-stack architecture with WebSockets, pseudo-terminal process management in Node.js, role-based access control with JWT, and practical LLM tool-use via structured JSON prompting. The AI diagnostic feature in particular illustrates how large language models can be safely integrated into operational workflows through risk-rated, human-in-the-loop action pipelines.
