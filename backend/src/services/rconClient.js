const net = require('net');

function buildPacket(id, type, payload) {
  const body = Buffer.from(payload + '\0', 'utf8');
  const buf = Buffer.alloc(4 + 4 + 4 + body.length + 1);
  buf.writeInt32LE(4 + 4 + body.length + 1, 0); // length field
  buf.writeInt32LE(id, 4);
  buf.writeInt32LE(type, 8);
  body.copy(buf, 12);
  buf.writeUInt8(0, 12 + body.length);
  return buf;
}

function sendCommand(host, port, password, command, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buf = Buffer.alloc(0);
    let authed = false;
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('RCON timeout')); }, timeout);

    socket.connect(port, host, () => socket.write(buildPacket(1, 3, password)));

    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 12) {
        const len = buf.readInt32LE(0);
        if (buf.length < len + 4) break;
        const reqId = buf.readInt32LE(4);
        const payload = buf.slice(12, len + 4 - 2).toString('utf8');
        buf = buf.slice(len + 4);

        if (!authed) {
          if (reqId === -1) { clearTimeout(timer); socket.destroy(); reject(new Error('RCON auth failed')); }
          else { authed = true; socket.write(buildPacket(2, 2, command)); }
        } else {
          clearTimeout(timer); socket.destroy(); resolve(payload);
        }
      }
    });

    socket.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

module.exports = { sendCommand };
