const jwt = require('jsonwebtoken');

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'AUTH_001', message: 'Unauthorized' } });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: { code: 'AUTH_001', message: 'Unauthorized' } });
  }
}

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    socket.data = verifyToken(token);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}

module.exports = { requireAuth, authenticateSocket, verifyToken };
