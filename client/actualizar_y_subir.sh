#!/bin/bash

echo "🏗️ Construyendo la App Completa (PDfinance v1.0)..."

# 1. Crear configuración de Firebase en el Cliente
cat <<EOT > client/src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "pdfinance-58751",
  storageBucket: "pdfinance-58751.appspot.com",
  appId: "1:748924403166:web:865187e83868065f41295b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
EOT

# 2. El Código de la App Completa (App.jsx)
cat <<EOT > client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: '', category: 'Comida' });
  const [loading, setLoading] = useState(true);

  // Leer datos en tiempo real de Firestore
  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalBalance = transactions.reduce((acc, curr) => acc + Number(curr.amount), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    
    await addDoc(collection(db, "transactions"), {
      ...formData,
      amount: Number(formData.amount),
      date: new Date().toISOString()
    });
    
    setFormData({ title: '', amount: '', category: 'Comida' });
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-ios-bg font-sans select-none pb-32">
      {/* Header Estilo Apple */}
      <div className="max-w-md mx-auto bg-ios-bg/80 backdrop-blur-md sticky top-0 z-40 px-6 pt-14 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PDfinance • Global</p>
            <h1 className="text-4xl font-extrabold tracking-tight">
              \${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h1>
          </div>
          <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center text-xl">👨‍💻</div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 pt-4">
        <h2 className="text-xl font-bold mb-4 px-1">Actividad Reciente</h2>
        {loading ? (
           <div className="text-center py-10 text-slate-400">Cargando...</div>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-[2rem] flex items-center justify-between shadow-sm border border-slate-50 active:scale-95 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-ios-bg rounded-2xl flex items-center justify-center text-2xl">
                    {t.category === 'Comida' ? '🍷' : t.category === 'Auto' ? '🔧' : '💰'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{t.title}</h3>
                    <p className="text-xs font-medium text-slate-400 uppercase">{t.category}</p>
                  </div>
                </div>
                <span className={\`font-black \${t.amount > 0 ? 'text-ios-green' : 'text-slate-800'}\`}>
                  {t.amount > 0 ? '+' : ''}\${Math.abs(t.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Botón Central Flotante */}
      <button 
        onClick={() => setShowModal(true)}
        className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-ios-blue text-white w-16 h-16 rounded-full shadow-2xl shadow-ios-blue/40 flex items-center justify-center active:scale-90 transition-all z-50 border-[6px] border-white"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>

      {/* Modal Estilo iOS (Sheet) */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 animate-slide-up shadow-2xl max-w-md mx-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
            <h2 className="text-2xl font-black mb-6 text-center">Nuevo Registro</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="text" placeholder="¿En qué gastaste?" 
                className="w-full bg-ios-bg p-4 rounded-2xl outline-none font-bold"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              />
              <input 
                type="number" placeholder="Monto (ej: 15.00)" 
                className="w-full bg-ios-bg p-4 rounded-2xl outline-none font-bold"
                value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
              />
              <select 
                className="w-full bg-ios-bg p-4 rounded-2xl outline-none font-bold appearance-none"
                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="Comida">Comida 🍷</option>
                <option value="Ingreso">Ingreso 💰</option>
                <option value="Auto">Auto 🔧</option>
                <option value="Varios">Varios 📦</option>
              </select>
              <button type="submit" className="w-full bg-ios-blue text-white p-5 rounded-2xl font-black text-lg active:scale-95 transition-transform shadow-lg shadow-ios-blue/30">
                Guardar Registro
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navegación Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 px-8 pt-3 pb-10 flex justify-between items-center z-40 max-w-md mx-auto">
        <div className="flex flex-col items-center text-ios-blue">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h1v7c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-7h1a1 1 0 00.707-1.707l-9-9a.999.999 0 00-1.414 0l-9 9A1 1 0 003 13zm7 7v-5h4v5h-4z"></path></svg>
          <span className="text-[10px] font-bold mt-1">Inicio</span>
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

echo "🚀 Subiendo App funcional a la nube..."
git add .
git commit -m "PDfinance v1.0: Firestore real + Modal iOS"
git push origin main

echo "✅ ¡Listo! Abre tu App en 2 minutos: https://pdfinance-58751.web.app"
open https://pdfinance-58751.web.app
