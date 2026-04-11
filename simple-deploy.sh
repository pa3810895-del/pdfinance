#!/bin/bash
set -e

cd ~/finance-app-pareja || exit 1

echo "→ Entrando a /client..."
cd client

echo "→ Creando PWA files..."
mkdir -p public

cat > public/manifest.json << 'MANIFEST'
{
  "name": "PDFinance",
  "short_name": "PDFinance",
  "description": "Gestor de finanzas personal",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#1a1a2e",
  "background_color": "#F2F2F7",
  "icons": [{"src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect fill='%231a1a2e' width='192' height='192'/><text x='96' y='130' font-size='110' font-weight='bold' fill='%2334C759'>$</text></svg>", "sizes": "192x192", "type": "image/svg+xml", "purpose": "any"}]
}
MANIFEST

cat > public/service-worker.js << 'SW'
const CACHE_NAME = 'pdfinance-v1';
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(['/', '/index.html']).catch(() => {})).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {if (r && r.status === 200) {const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c));} return r;}).catch(() => caches.match(e.request).then(r => r || new Response('Offline', {status: 503}))));
});
SW

cat > index.html << 'HTML'
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1a1a2e" />
    <meta name="description" content="PDFinance - Gestor de finanzas" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>PDFinance</title>
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%231a1a2e' width='100' height='100'/><text x='50' y='75' font-size='50' font-weight='bold' fill='%2334C759'>$</text></svg>">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
HTML

echo "✓ PWA files created"

if ! grep -q "service-worker.js" src/App.jsx; then
  sed -i '' "1i\\
if ('serviceWorker' in navigator) {\\
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));\\
}\\
" src/App.jsx
  echo "✓ Service Worker registrado en App.jsx"
fi

echo "→ npm install..."
npm install --legacy-peer-deps 2>&1 | grep -E "added|up to date"

echo "→ npm run build..."
npm run build 2>&1 | tail -5

if [ ! -d "dist" ]; then
  echo "✗ Error: no se creó dist/"
  exit 1
fi

echo "✓ Build completado"

cd ..

echo "→ Configurando firebase.json..."
cat > firebase.json << 'FB'
{
  "hosting": {
    "public": "client/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{"source": "**", "destination": "/index.html"}],
    "headers": [
      {"source": "/service-worker.js", "headers": [{"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"}]},
      {"source": "/manifest.json", "headers": [{"key": "Content-Type", "value": "application/manifest+json"}]}
    ]
  }
}
FB

echo "✓ firebase.json configurado"

echo "→ Git commit..."
git config user.name "Deploy" 2>/dev/null || true
git config user.email "deploy@pdfinance" 2>/dev/null || true
git add -A
git commit -m "🚀 Deploy: PWA + Firebase Hosting" 2>/dev/null || echo "✓ Sin cambios nuevos"

echo "→ Git push..."
git push 2>/dev/null || git push -u origin "$(git rev-parse --abbrev-ref HEAD)" 2>/dev/null || true

if ! command -v firebase &> /dev/null; then
  echo "→ Instalando Firebase CLI..."
  npm install -g firebase-tools 2>&1 | tail -2
fi

echo ""
echo "✅ LISTO PARA DESPLEGAR"
echo ""
echo "Ejecuta:"
echo "  firebase deploy"
echo ""
echo "Resultado:"
echo "  https://pdfinance-58751.web.app"
echo ""
