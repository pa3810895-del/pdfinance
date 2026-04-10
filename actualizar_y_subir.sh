#!/bin/bash

echo "🛠️ Reparando configuración y subiendo App..."

# 1. Configurar PostCSS (Formato exacto para v4)
cat <<EOT > client/postcss.config.js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
}
EOT

# 2. Configurar Tailwind v4 (Ahora es más simple)
cat <<EOT > client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
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

# 3. Asegurar que el CSS importe Tailwind correctamente
cat <<EOT > client/src/index.css
@import "tailwindcss";

@theme {
  --color-ios-bg: #F2F2F7;
  --color-ios-card: #FFFFFF;
  --color-ios-blue: #007AFF;
  --color-ios-pink: #FF2D55;
  --color-ios-green: #34C759;
}

body {
  background-color: var(--color-ios-bg);
  @apply text-slate-900 antialiased;
  -webkit-tap-highlight-color: transparent;
}
EOT

# 4. Sincronizar con GitHub y Firebase
echo "🚀 Subiendo cambios a la nube..."
git add .
git commit -m "Fix total: Tailwind v4 + PostCSS"
git push origin main

echo "✅ ¡Listo! Abriendo navegador..."
open https://pdfinance-58751.web.app
