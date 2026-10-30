# Del plano a la casa · Recorrido 3D

App web para subir o dibujar un plano de planta y recorrerlo en 3D, amoblado.
Incluye un pequeño servidor que lee los planos con la API de Claude.

## Qué hace cada parte
- `public/index.html`: la app (recorrido 3D, editor de planos, exportar JPG/PDF).
- `server.js`: sirve la app y expone `POST /api/plan`, que recibe la imagen del plano,
  se la envía a Claude y devuelve los ambientes y puertas. La clave de la API queda en el
  servidor y nunca llega al navegador.

## Probarlo en tu computadora
Requiere Node.js 20 o superior.
```
npm install
cp .env.example .env        # y completá ANTHROPIC_API_KEY
node --env-file=.env server.js
```
Abrí http://localhost:3000

## Publicarlo (opciones simples)
**Render / Railway / Fly.io** (la más fácil):
1. Subí esta carpeta a un repositorio de GitHub.
2. Creá un servicio web desde el repositorio (detectan Node o usan el `Dockerfile`).
3. Comando de inicio: `npm start`.
4. En "Environment" cargá `ANTHROPIC_API_KEY` y, recomendado, `ACCESS_CODE`.
5. Conectá tu dominio (por ejemplo `recorrido.tudominio.com`).

**Servidor propio (VPS) con Docker:**
```
docker build -t plano-3d .
docker run -d -p 3000:3000 --env-file .env plano-3d
```
Poné un proxy con HTTPS delante (Caddy o Nginx).

## Variables de entorno
| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Clave de la API de Claude (obligatoria para leer planos) |
| `ACCESS_CODE` | Código que pide la app antes de leer un plano. Recomendado, para que nadie gaste tu crédito |
| `RATE_PER_HOUR` | Máximo de planos por IP por hora (por defecto 20) |
| `CLAUDE_MODEL` | Modelo a usar (por defecto `claude-sonnet-5-5`) |

## Costos y seguridad
- Cada plano leído es una consulta a la API y se cobra a tu cuenta de Anthropic.
  Fijá un límite de gasto en la consola de Anthropic.
- Sin `ACCESS_CODE`, cualquiera con el enlace puede subir planos. El límite por IP ayuda,
  pero no reemplaza al código.
- El dibujo en el editor, el recorrido 3D y las exportaciones funcionan sin servidor
  y sin costo.

## Insertarlo en tu página
```html
<iframe src="https://recorrido.tudominio.com" style="width:100%;height:80vh;border:0" allowfullscreen></iframe>
```
