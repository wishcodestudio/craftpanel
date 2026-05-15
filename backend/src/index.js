require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const filesRoutes = require('./routes/files');
const aiRoutes = require('./routes/ai');
const serversRoutes = require('./routes/servers');
const activityRoutes = require('./routes/activity');
const { setupTerminalSocket } = require('./socket/terminal');
const { setupLogsSocket } = require('./socket/logs');
const { authenticateSocket } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

const ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: ORIGIN, credentials: true },
});

app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/servers', serversRoutes);
app.use('/api/activity', activityRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
});

io.use(authenticateSocket);
io.on('connection', (socket) => {
  setupTerminalSocket(io, socket);
  setupLogsSocket(io, socket);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`CraftPanel backend running on http://localhost:${PORT}`);
  console.log(`  DB: ${process.env.DATABASE_URL ? 'configured' : 'NOT SET — set DATABASE_URL in .env'}`);
  console.log(`  AI: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT SET — set ANTHROPIC_API_KEY in .env'}`);
});
