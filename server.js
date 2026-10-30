import express from 'express';

const PORT = process.env.PORT || 3000;
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const ACCESS_CODE = process.env.ACCESS_CODE || '';
const PER_HOUR = Number(process.env.RATE_PER_HOUR || 20);

const PROMPT = "Sos un asistente de arquitectura. La imagen es un plano de planta de una vivienda, vista desde arriba. Devolvé SOLO un JSON, sin texto extra ni backticks, con este formato exacto: {\"name\":string,\"rooms\":[{\"n\":string,\"type\":\"sala|cocina|dormitorio|bano|otro\",\"x0\":number,\"z0\":number,\"x1\":number,\"z1\":number}],\"doors\":[{\"a\":string,\"b\":string,\"x\":number,\"z\":number}]}. Reglas: todo en metros; origen en la esquina superior izquierda del plano, x crece hacia la derecha y z hacia abajo; cada ambiente es un rectángulo y no se superponen (una forma en L se parte en dos rectángulos); usá las medidas escritas en el plano y, si no hay, estimalas (un dormitorio mide unos 3 x 3,5 m); los nombres de ambiente son únicos; cada puerta conecta dos ambientes que comparten una pared (\"a\" y \"b\" son sus nombres) o un ambiente con el exterior (\"b\":\"exterior\"); \"x\" y \"z\" son la posición aproximada de la puerta en metros; incluí la puerta de entrada (con \"b\":\"exterior\") y todas las puertas entre ambientes; máximo 14 ambientes.";

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '12mb' }));
app.use(express.static('public'));
app.get('/health', (_req, res) => res.json({ ok: true }));

// límite simple por IP (en memoria)
const hits = new Map();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  if (list.length >= PER_HOUR) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list); return false;
}

function parsePlan(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('Respuesta sin JSON');
  return JSON.parse(text.slice(a, b + 1));
}

app.post('/api/plan', async (req, res) => {
  try {
    if (ACCESS_CODE && req.get('x-access-code') !== ACCESS_CODE)
      return res.status(401).json({ error: 'Código de acceso incorrecto.' });
    if (!KEY) return res.status(500).json({ error: 'Falta configurar ANTHROPIC_API_KEY en el servidor.' });
    const image = req.body && req.body.image;
    if (typeof image !== 'string' || image.length < 100)
      return res.status(400).json({ error: 'Falta la imagen del plano.' });
    if (limited(req.ip))
      return res.status(429).json({ error: 'Demasiadas consultas. Probá de nuevo más tarde.' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: PROMPT }
        ] }]
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Anthropic API', r.status, data && data.error);
      return res.status(502).json({ error: 'El servicio de IA no respondió (' + r.status + '). Revisá la clave y el modelo.' });
    }
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    res.json({ plan: parsePlan(text) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No pude convertir ese plano. Probá con una imagen más nítida.' });
  }
});

app.listen(PORT, () => console.log('Servidor listo en http://localhost:' + PORT));
