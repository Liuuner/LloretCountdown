import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = fs.existsSync(distDir) ? distDir : null;
const port = Number(process.env.PORT || 3001);

const players = new Map();
const clients = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

function sendSse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcast(event, payload, excludePlayerId = null) {
  for (const [clientId, client] of clients) {
    if (excludePlayerId && clientId === excludePlayerId) continue;
    sendSse(client, event, payload);
  }
}

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function pruneStalePlayers() {
  const now = Date.now();
  for (const [id, player] of players) {
    if (now - player.updatedAt > 15_000) {
      players.delete(id);
      broadcast('leave', { type: 'leave', id });
    }
  }
}

setInterval(pruneStalePlayers, 5_000).unref();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, players: players.size, mode: publicDir ? 'production' : 'development' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/multiplayer/events') {
    const playerId = url.searchParams.get('playerId') || `anon-${Math.random().toString(36).slice(2, 8)}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(': connected\n\n');
    clients.set(playerId, res);
    sendSse(res, 'snapshot', { type: 'snapshot', players: Array.from(players.values()) });

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 20_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(playerId);
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/multiplayer/state') {
    try {
      const body = await collectRequestBody(req);
      const player = body?.player;
      if (!player?.id) {
        sendJson(res, 400, { error: 'Missing player.id' });
        return;
      }
      player.updatedAt = Date.now();
      players.set(player.id, player);
      broadcast('state', { type: 'state', player }, player.id);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid JSON body' });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/multiplayer/leave') {
    try {
      const body = await collectRequestBody(req);
      const id = body?.id;
      if (!id) {
        sendJson(res, 400, { error: 'Missing player id' });
        return;
      }
      players.delete(id);
      broadcast('leave', { type: 'leave', id }, id);
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON body' });
    }
    return;
  }

  if (publicDir) {
    let filePath = path.join(publicDir, decodeURIComponent(url.pathname));
    if (url.pathname === '/') {
      filePath = path.join(publicDir, 'index.html');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(publicDir, 'index.html');
    }

    try {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    } catch {
      sendJson(res, 500, { error: 'Failed to read file' });
      return;
    }
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Multiplayer server listening on http://0.0.0.0:${port}`);
});
