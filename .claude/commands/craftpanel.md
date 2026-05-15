# /craftpanel — CraftPanel Developer Skill

Use this skill to help develop, run, and manage the CraftPanel project at `C:\Users\worra\Desktop\craftpanel`.

## Actions

### Start development environment
When the user wants to run / start / dev the project:
1. Check that `.env` exists. If missing, tell the user to copy `.env.example` to `.env` and fill in the values.
2. Check PostgreSQL is running: `! docker compose -f C:\Users\worra\Desktop\craftpanel\docker-compose.yml ps`
3. If postgres is not running, start it: `! docker compose -f C:\Users\worra\Desktop\craftpanel\docker-compose.yml up -d postgres`
4. Start the dev servers: `! cd C:\Users\worra\Desktop\craftpanel && npm run dev`

### First-time setup / install dependencies
When the user wants to setup or install for the first time:
1. `! cd C:\Users\worra\Desktop\craftpanel && npm run install:all`
2. Ensure `.env` exists (copy from `.env.example`, instruct user to fill in DATABASE_URL and ANTHROPIC_API_KEY)
3. Start PostgreSQL: `! docker compose -f C:\Users\worra\Desktop\craftpanel\docker-compose.yml up -d postgres`
4. Run setup wizard: `! cd C:\Users\worra\Desktop\craftpanel && node setup.js --demo`

### Add a server (to the database)
When the user wants to add a new Minecraft server, run SQL against PostgreSQL:
1. Ask for: group name, server name, dir_path, IP, port, rcon_port, rcon_password, version
2. Execute the SQL INSERT into server_groups and servers tables
3. Grant access to the owner user

### Check project status
When the user wants to check status:
1. `! docker compose -f C:\Users\worra\Desktop\craftpanel\docker-compose.yml ps`
2. Check if backend is running on port 3001: `! curl -s http://localhost:3001/api/health`
3. Report what's running and what's not

### Build for production
When the user wants to build:
1. `! cd C:\Users\worra\Desktop\craftpanel && npm run build`
2. Remind user that in production they should serve the frontend's `dist/` folder via the backend or a CDN

### Reset database
When the user wants to reset / wipe the database:
1. Confirm with the user first — this is destructive
2. `! docker compose -f C:\Users\worra\Desktop\craftpanel\docker-compose.yml down -v`
3. `! docker compose -f C:\Users\worra\Desktop\craftpanel\docker-compose.yml up -d postgres`
4. `! cd C:\Users\worra\Desktop\craftpanel && node setup.js --demo`

## Key files
- `backend/src/index.js` — Express + socket.io entry point
- `backend/src/routes/` — REST API routes (auth, files, ai, servers, activity)
- `backend/src/services/` — Business logic (fileManager, aiService, rconClient, logWatcher)
- `backend/src/socket/` — WebSocket handlers (terminal, logs)
- `frontend/src/App.jsx` — Root React component, auth state, server selection
- `frontend/src/components/` — All page components
- `setup.js` — First-run wizard (creates DB tables + admin user)
- `.env` — Environment variables (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY)

## Environment variables required
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `ANTHROPIC_API_KEY` | Required for AI Diagnostics feature |
| `PORT` | Backend port (default 3001) |
| `FRONTEND_URL` | Vite dev server URL (default http://localhost:5173) |

## Tech stack
- **Backend**: Node.js, Express, socket.io, pg (PostgreSQL), bcrypt, jsonwebtoken, chokidar, @anthropic-ai/sdk
- **Frontend**: React 18, Vite, Monaco Editor, xterm.js, socket.io-client, axios
- **Database**: PostgreSQL 16 (via Docker)
- **AI**: Claude claude-sonnet-4-20250514 with prompt caching
