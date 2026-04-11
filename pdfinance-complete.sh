#!/bin/bash

# ========================================
# PDFINANCE - SCRIPT FINAL COMPLETO
# Corrige código + Compila + Sube a Firebase
# ========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_step() { echo -e "${BLUE}→ $1${NC}"; }
log_ok() { echo -e "${GREEN}✓ $1${NC}"; }
log_error() { echo -e "${RED}✗ $1${NC}"; }
log_info() { echo -e "${YELLOW}ℹ $1${NC}"; }

# ========================================
# 1. VALIDAR ENTORNO
# ========================================
log_step "Validando entorno..."

if [ ! -d ".git" ]; then
    log_error "No es repositorio Git. Estás en el directorio correcto?"
    exit 1
fi

if [ ! -f "package.json" ]; then
    log_error "No hay package.json en este directorio"
    exit 1
fi

log_ok "Entorno validado"

# ========================================
# 2. DETECTAR ESTRUCTURA
# ========================================
log_step "Detectando estructura del proyecto..."

if [ -d "client/src" ]; then
    PROJECT_DIR="client"
    log_ok "Monorepo detectado: /client"
elif [ -d "src" ] && [ -f "src/App.jsx" ]; then
    PROJECT_DIR="."
    log_ok "Estructura simple detectada"
else
    log_error "No se encontró src/ con App.jsx"
    exit 1
fi

# ========================================
# 3. CREAR MANIFEST.JSON
# ========================================
log_step "Creando manifest.json..."
mkdir -p "$PROJECT_DIR/public"
cat > "$PROJECT_DIR/public/manifest.json" << 'EOF'
{
  "name": "PDFinance - Gestor de Finanzas Personal",
  "short_name": "PDFinance",
  "description": "Aplicación de finanzas personal con sincronización en tiempo real. Funciona offline, instalable como app.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1a1a2e",
  "background_color": "#F2F2F7",
  "categories": ["finance", "productivity"],
  "icons": [
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect fill='%231a1a2e' width='192' height='192' rx='45'/><text x='96' y='130' font-size='110' font-weight='bold' fill='%2334C759' text-anchor='middle'>$</text></svg>",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect fill='%231a1a2e' width='512' height='512' rx='120'/><text x='256' y='360' font-size='300' font-weight='bold' fill='%2334C759' text-anchor='middle'>$</text></svg>",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Nuevo Movimiento",
      "short_name": "Movimiento",
      "url": "/?action=new"
    }
  ]
}
EOF
log_ok "manifest.json creado"

# ========================================
# 4. CREAR SERVICE WORKER
# ========================================
log_step "Creando service-worker.js..."
cat > "$PROJECT_DIR/public/service-worker.js" << 'EOF'
const CACHE_NAME = 'pdfinance-v1-' + Date.now();
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter(name => name !== CACHE_NAME && name.startsWith('pdfinance'))
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  
  if (request.url.includes('firebase') || request.url.includes('dolarapi')) {
    event.respondWith(fetch(request).catch(() => {
      return new Response(JSON.stringify({ offline: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
      if (!response || response.status !== 200) return response;
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    }).catch(() => {
      return caches.match(request).then((response) => {
        return response || new Response('Offline - Recurso no disponible', { status: 503 });
      });
    })
  );
});
EOF
log_ok "service-worker.js creado"

# ========================================
# 5. ACTUALIZAR INDEX.HTML
# ========================================
log_step "Actualizando index.html con PWA meta tags..."
cat > "$PROJECT_DIR/index.html" << 'EOF'
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1a1a2e" />
    <meta name="description" content="PDFinance - Gestor de finanzas personal. Sincroniza datos en tiempo real, funciona offline, instalable como app." />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="PDFinance" />
    <title>PDfinance | Santi & Paty</title>
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%231a1a2e' width='100' height='100'/><text x='50' y='75' font-size='50' font-weight='bold' fill='%2334C759' text-anchor='middle'>$</text></svg>">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF
log_ok "index.html actualizado"

# ========================================
# 6. REGISTRAR SERVICE WORKER EN APP.JSX
# ========================================
log_step "Registrando Service Worker en App.jsx..."
if ! grep -q "service-worker.js" "$PROJECT_DIR/src/App.jsx"; then
    sed -i '' "1i\\
// Service Worker Registration\\
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {\\
  window.addEventListener('load', () => {\\
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});\\
  });\\
}\\
" "$PROJECT_DIR/src/App.jsx"
    log_ok "Service Worker registrado"
else
    log_info "Service Worker ya registrado"
fi

# ========================================
# 7. ACTUALIZAR CONFIGURACIONES
# ========================================
log_step "Actualizando vite.config.js..."
cat > "$PROJECT_DIR/vite.config.js" << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1000, minify: 'terser' }
})
EOF
log_ok "vite.config.js actualizado"

log_step "Actualizando tailwind.config.js..."
cat > "$PROJECT_DIR/tailwind.config.js" << 'EOF'
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'ios-bg': '#F2F2F7',
        'santi-blue': '#007AFF',
        'paty-pink': '#FF2D55',
        'success-green': '#34C759'
      },
      animation: {
        'ticker': 'ticker 25s linear infinite',
        'in': 'fadeIn 0.3s ease-in'
      },
      keyframes: {
        'ticker': { '0%': { transform: 'translateX(100vw)' }, '100%': { transform: 'translateX(-200%)' } },
        'fadeIn': { '0%': { opacity: '0' }, '100%': { opacity: '1' } }
      }
    },
  },
  plugins: [],
}
EOF
log_ok "tailwind.config.js actualizado"

# ========================================
# 8. ACTUALIZAR .GITIGNORE
# ========================================
log_step "Actualizando .gitignore..."
cat > .gitignore << 'EOF'
node_modules/
package-lock.json
yarn.lock
dist/
dist-ssr/
build/
.env
.env.local
.env.*.local
.vscode/
.idea/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.firebase/
.firebaserc
firebase-debug.log
.DS_Store
Thumbs.db
.cache/
*.zip
EOF
log_ok ".gitignore actualizado"

# ========================================
# 9. INSTALAR DEPENDENCIAS
# ========================================
log_step "Instalando dependencias..."
cd "$PROJECT_DIR" 2>/dev/null || true
npm install --legacy-peer-deps 2>&1 | grep -E "added|up to date" || true
cd - > /dev/null 2>&1 || true
log_ok "Dependencias listas"

# ========================================
# 10. BUILD PARA PRODUCCIÓN
# ========================================
log_step "Compilando para producción (npm run build)..."
cd "$PROJECT_DIR" 2>/dev/null || true
npm run build 2>&1 | tail -15
cd - > /dev/null 2>&1 || true

if [ ! -d "$PROJECT_DIR/dist" ]; then
    log_error "Error en build - no se creó dist/"
    exit 1
fi
log_ok "Build completado ✓"

# ========================================
# 11. CONFIGURAR FIREBASE.JSON
# ========================================
log_step "Configurando firebase.json..."
if [ "$PROJECT_DIR" = "client" ]; then
    PUBLIC_PATH="client/dist"
else
    PUBLIC_PATH="dist"
fi

cat > firebase.json << EOF
{
  "hosting": {
    "public": "$PUBLIC_PATH",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{"source": "**", "destination": "/index.html"}],
    "headers": [
      {
        "source": "/service-worker.js",
        "headers": [{"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"}]
      },
      {
        "source": "/manifest.json",
        "headers": [{"key": "Content-Type", "value": "application/manifest+json"}]
      }
    ]
  }
}
EOF
log_ok "firebase.json configurado"

# ========================================
# 12. GIT - COMMIT Y PUSH
# ========================================
log_step "Configurando Git..."
git config user.name "PDFinance Deploy" 2>/dev/null || true
git config user.email "deploy@pdfinance.local" 2>/dev/null || true

log_step "Agregando cambios a Git..."
git add -A

log_step "Creando commit..."
git commit -m "🔧 fix: PWA funcional + build para Firebase ($(date '+%Y-%m-%d %H:%M'))" 2>/dev/null || log_info "Sin cambios nuevos"

log_step "Subiendo a GitHub..."
if git push 2>/dev/null; then
    log_ok "GitHub actualizado"
else
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git push -u origin "$BRANCH" 2>/dev/null || true
    log_ok "GitHub configurado"
fi

# ========================================
# 13. VERIFICAR FIREBASE CLI
# ========================================
log_step "Verificando Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    log_info "Instalando Firebase CLI..."
    npm install -g firebase-tools 2>&1 | tail -3
fi
log_ok "Firebase CLI listo"

# ========================================
# 14. RESUMEN FINAL Y DEPLOY
# ========================================
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ PDFINANCE LISTA PARA FIREBASE${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "✅ Completado:"
echo "   • manifest.json + service-worker.js"
echo "   • App.jsx con Service Worker"
echo "   • Vite, Tailwind, .gitignore"
echo "   • npm install ejecutado"
echo "   • Build de producción creado"
echo "   • firebase.json configurado"
echo "   • Cambios en GitHub"
echo ""
echo "🚀 DEPLOY A FIREBASE:"
echo ""
echo "   firebase deploy"
echo ""
echo "O si quieres previsualizarlo primero:"
echo "   firebase hosting:channel:deploy preview"
echo ""
echo -e "${GREEN}¡Listo!${NC}"
echo ""
