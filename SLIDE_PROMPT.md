# Slide Generation Prompt

Copy everything between the triple dashes below and paste it directly into Claude at claude.ai.

---

```
I need you to create a complete academic presentation slide deck for a university project called **CraftPanel**. 

## Output format
- Produce **10 slides** in Markdown using `---` as the slide separator (Marp-compatible format).
- Each slide has three sections:
  1. **# Slide Title** (English)
  2. Bullet-point content (English)
  3. **> Speaker Notes (ภาษาไทย):** followed by 2–4 sentences of Thai speaker notes

## Tone & style
- Academic, formal but approachable
- Slide content should be concise (max 5–6 bullets per slide)
- Speaker notes should be natural spoken Thai, not a literal translation

## Project facts (use these — do not invent details)

**Project name:** CraftPanel — AI-Powered Minecraft Server Management Panel

**What it is:** A self-hostable web-based control panel for managing Minecraft Java Edition servers. Provides a unified interface for real-time console access, configuration file editing, live log monitoring, and AI-assisted error diagnostics.

**Problem:**
- Minecraft server administration is fragmented: SSH for console, FTP for files, manual log reading for errors
- Existing panels (Pterodactyl, AMP) lack integrated AI troubleshooting
- Non-expert admins struggle to diagnose server errors without structured guidance
- Target users: small-to-medium server admins, student communities

**Objectives:**
- Single-pane-of-glass web UI for all common server admin tasks
- AI-powered diagnostic engine to analyze errors and apply fixes
- Role-based multi-server access control (user → group → server)
- Self-hostable with a guided first-run setup wizard
- Real-time responsiveness via WebSockets

**System architecture:**
- 3-tier: React 18 frontend (Vite) ↔ Node.js/Express + socket.io backend ↔ PostgreSQL 16
- node-pty spawns the Minecraft server in a pseudo-terminal for ANSI passthrough
- chokidar watches latest.log and streams lines to clients via socket.io
- Custom RCON TCP client for sending commands to running servers
- Anthropic Claude API (primary AI), Google Gemini and OpenAI as fallbacks

**6 main features:**
1. Authentication & RBAC — JWT login, bcrypt passwords, user→group→server access model
2. Dashboard — Live player count/TPS stats, real-time log feed with "→ AI" button on errors, activity feed
3. Interactive Terminal — xterm.js emulator, Start/Stop/Restart controls, RCON or stdin command execution, ANSI colors
4. File Manager — Monaco Editor (VS Code's editor), directory browser, create/edit/delete files with path traversal protection
5. AI Diagnostics — Paste or auto-fill error text, Claude/Gemini/OpenAI analysis, structured fix proposals (config edits, RCON commands, JVM flags), risk rating (low/medium/high), one-click apply
6. Activity Log — Audit trail of all user actions (logins, file edits, AI analyses, fixes applied), per-server or global view

**Tech stack:**
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Monaco Editor, xterm.js, socket.io-client, axios |
| Backend | Node.js, Express, socket.io, node-pty, chokidar |
| Database | PostgreSQL 16 (Docker) |
| AI | Anthropic Claude (prompt caching), Google Gemini, OpenAI |
| Auth | JWT + bcrypt |

**Key technical challenges solved:**
- Log reconnect recovery: in-memory ring buffer + backfill event on reconnect
- ANSI colors in browser: node-pty pseudo-terminal passthrough + xterm.js rendering
- Safe AI fix application: structured JSON with risk field + discrete actions (not full-file rewrites) + human confirmation step
- Path traversal prevention: server-side path normalization clamped to server root directory

**Future work:**
- Plugin marketplace browser
- Scheduled backups and automated restart policies
- Player management UI (ban/whitelist/op)
- Multi-node deployment over SSH
- Mobile-responsive UI
- Webhook notifications (Discord/Slack)

## Slide structure to follow

1. **Title Slide** — Project name, subtitle, university/course context placeholder, date
2. **Problem Statement** — Why Minecraft server admin is hard today; gap in existing tools
3. **Objectives** — What CraftPanel aims to achieve (4–5 clear goals)
4. **System Architecture** — 3-tier diagram described in text/ASCII, key components listed
5. **Core Features Overview** — All 6 features listed with one-line descriptions
6. **AI Diagnostics Deep-Dive** — How the AI workflow works step by step (input → analysis → proposal → apply)
7. **Technology Stack** — Key technologies grouped by layer
8. **Technical Highlights** — The 4 engineering challenges and how they were solved
9. **Demo & Results** — Describe what a live demo looks like (what the audience would see); mention any metrics or outcomes
10. **Future Work & Conclusion** — Roadmap items + closing statement on academic contribution

Now generate the full 10-slide deck in the format described above.
```

---

## Tips for using this prompt

- Paste the block above (between the triple dashes) into **claude.ai** in a new conversation.
- If you want a different visual style, add to the end: *"Use a dark navy and gold color theme."*
- To get Marp slides you can render directly, open VS Code with the Marp extension, paste the output into a `.md` file, and preview it.
- To add your own name/team: after Claude generates the deck, follow up with: *"On slide 1, replace the team placeholder with [your names]."*
