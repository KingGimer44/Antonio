const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
// Logger simple de peticiones
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});
app.use(express.static(path.join(__dirname, '..', 'public'), { index: 'index.html' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

function normalizeWhatsApp(to) {
  const trimmed = String(to || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('whatsapp:')) return trimmed;
  if (/^\+\d{8,15}$/.test(trimmed)) return `whatsapp:${trimmed}`;
  return null;
}

function buildGameMessage(game) {
  const title = game?.title || 'Juego';
  const year = game?.year ? ` (${game.year})` : '';
  const genre = game?.genre ? `\nGénero: ${game.genre}` : '';
  const platforms = Array.isArray(game?.platforms) && game.platforms.length ? `\nPlataformas: ${game.platforms.join(', ')}` : '';
  const rating = typeof game?.rating === 'number' ? `\nPuntuación: ${game.rating.toFixed(1)} ⭐` : '';
  const desc = game?.description ? `\n\n${game.description}` : '';
  return `🎮 ${title}${year}${genre}${platforms}${rating}${desc}`;
}

app.post('/api/whatsapp', async (req, res) => {
  try {
    const { to, game, cart } = req.body || {};
    if (!to) {
      return res.status(400).json({ error: 'Faltan datos: to es obligatorio.' });
    }

    const toWhatsApp = normalizeWhatsApp(to);
    if (!toWhatsApp) {
      return res.status(400).json({ error: 'Número de WhatsApp inválido. Usa formato +<código_pais><número> o whatsapp:+...' });
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886

    let body;
    if (cart) {
      body = cart; // El carrito ya viene formateado desde el frontend
    } else if (game && game.title) {
      body = buildGameMessage(game);
    } else {
      return res.status(400).json({ error: 'Faltan datos: game o cart son obligatorios.' });
    }

    if (!sid || !token || !from) {
      console.log('[WHATSAPP:SIMULATED]', { toWhatsApp, body });
      return res.status(200).json({ ok: true, simulated: true });
    }

    const twilio = require('twilio')(sid, token);
    const msg = await twilio.messages.create({ from, to: toWhatsApp, body });
    return res.status(200).json({ ok: true, sid: msg.sid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error enviando WhatsApp.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor videojuegos escuchando en http://0.0.0.0:${PORT}`);
});


