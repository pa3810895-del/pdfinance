#!/bin/bash

echo "🎨 Actualizando diseño UI/UX (iOS Style)..."

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

# 2. Configurar PostCSS
cat <<EOT > client/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
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

# 4. El Código de la App (App.jsx)
cat <<EOT > client/src/App.jsx
import React, { useState } from 'react';

const App = () => {
  const [balance] = useState(1250.50);
  const transactions = [
    { id: 1, title: 'Cena en Pampatar', amount: -45.00, category: 'Comida', icon: '🍷' },
    { id: 2, title: 'Pago Freelance', amount: 500.00, category: 'Ingreso', icon: '💻' },
    { id: 3, title: 'Repuesto Elantra', amount: -25.00, category: 'Auto', icon: '🔧' },
  ];

  return (
    <div className="min-h-screen bg-ios-bg font-sans select-none pb-32">
      <div className="max-w-md mx-auto bg-ios-bg/80 backdrop-blur-md sticky top-0 z-50 px-6 pt-14 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Balance Neto</p>
            <h1 className="text-4xl font-extrabold tracking-tight">\$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h1>
          </div>
          <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center text-xl">👨‍💻</div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 pt-4">
        <div className="flex gap-4 mb-8">
          <div className="flex-1 bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-ios-green text-[10px] font-black uppercase mb-1">Ingresos</p>
            <p className="text-2xl font-bold">+\$500</p>
          </div>
          <div className="flex-1 bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-ios-pink text-[10px] font-black uppercase mb-1">Gastos</p>
            <p className="text-2xl font-bold">-\$70</p>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4 px-1">Actividad Reciente</h2>
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-[2rem] flex items-center justify-between shadow-sm border border-slate-50 active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-ios-bg rounded-2xl flex items-center justify-center text-2xl">{t.icon}</div>
                <div>
                  <h3 className="font-bold text-slate-800">{t.title}</h3>
                  <p className="text-xs font-medium text-slate-400">{t.category}</p>
                </div>
              </div>
              <span className={\`font-black \${t.amount > 0 ? 'text-ios-green' : 'text-slate-800'}\`}>
                {t.amount > 0 ? '+' : ''}\${Math.abs(t.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </main>

      <button className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-ios-blue text-white w-16 h-16 rounded-full shadow-2xl shadow-ios-blue/40 flex items-center justify-center active:scale-90 transition-all z-50 border-[6px] border-white">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 px-8 pt-3 pb-10 flex justify-between items-center z-40">
        <div className="flex flex-col items-center text-ios-blue">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h1v7c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-7h1a1 1 0 00.707-1.707l-9-9a.999.999 0 00-1.414 0l-9 9A1 1 0 003 13zm7 7v-5h4v5h-4z"></path></svg>
          <span className="text-[10px] font-bold mt-1">Dashboard</span>
        </div>
        <div className="flex flex-col items-center text-slate-300">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-[10px] font-bold mt-1">Historial</span>
        </div>
        <div className="w-10"></div>
        <div className="flex flex-col items-center text-slate-300">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle></svg>
          <span className="text-[10px] font-bold mt-1">Pareja</span>
        </div>
      </nav>
    </div>
  );
};

export default App;
EOT

echo "🚀 Subiendo cambios a la nube..."
git add .
git commit -m "${1:-"Mejora total de UI estilo iOS"}"
git push origin main

echo "✅ Proceso completado. ¡Mira tu iPhone en 2 minutos!"
