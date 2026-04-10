#!/bin/bash

echo "🎨 Actualizando diseño UI/UX (iOS Style - v4 FIX)..."

# 1. Configurar Tailwind
cat <<EOT > client/tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ios: {
          bg: '#F2F2F7',
          card: '#FFFFFF',
          blue: '#007AFF',
          pink: '#FF2D55',
          green: '#34C759'
        }
      }
    },
  },
  plugins: [],
}
EOT

# 2. Configurar PostCSS (CORREGIDO PARA V4)
cat <<EOT > client/postcss.config.js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
}
EOT

# 3. Estilos Globales
cat <<EOT > client/src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-ios-bg text-slate-900 antialiased;
  -webkit-tap-highlight-color: transparent;
}
EOT

# 4. El Código de la App (App.jsx) permanece igual...
# (He omitido el bloque largo de App.jsx aquí para no saturar, pero el script lo mantendrá)

echo "🚀 Subiendo cambios corregidos..."
git add .
git commit -m "Fix PostCSS para Tailwind v4"
git push origin main

echo "✅ Proceso completado. Abriendo navegador..."
open https://pdfinance-58751.web.app
