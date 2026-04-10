#!/bin/bash

echo "🚀 Evolucionando a PDfinance: Modo Pareja (Santi & Paty)..."

# 1. El Código de la App Versión Pareja
cat <<'EOT' > client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: '', category: 'Comida', spender: 'Santi' });

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  const totalBalance = transactions.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const santiTotal = transactions.filter(t => t.spender === 'Santi').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const patyTotal = transactions.filter(t => t.spender === 'Paty').reduce((acc, curr) => acc + Number(curr.amount), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    await addDoc(collection(db, "transactions"), {
      ...formData,
      amount: Number(formData.amount),
      date: new Date().toISOString()
    });
    setFormData({ ...formData, title: '', amount: '' });
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 select-none">
      {/* Header con Balance General */}
      <div className="max-w-md mx-auto sticky top-0 z-40 px-6 pt-14 pb-6 backdrop-blur-xl bg-[#F2F2F7]/90 border-b border-slate-200">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bolsa Compartida</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h1>
          </div>
          <div className="flex gap-1">
             <div className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-xs font-bold shadow-sm">S</div>
             <div className="w-8 h-8 rounded-full bg-[#FF2D55] text-white flex items-center justify-center text-xs font-bold shadow-sm">P</div>
          </div>
        </div>

        {/* Mini Resumen Individual */}
        <div className="flex gap-3 mt-6">
          <div className="flex-1 bg-white/50 p-3 rounded-2xl border border-white">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Santi</p>
            <p className="text-sm font-bold text-[#007AFF]">${santiTotal.toFixed(2)}</p>
          </div>
          <div className="flex-1 bg-white/50 p-3 rounded-2xl border border-white">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Paty</p>
            <p className="text-sm font-bold text-[#FF2D55]">${patyTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Lista de Movimientos */}
      <main className="max-w-md mx-auto px-6 pt-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>🕒</span> Últimos Movimientos
        </h2>
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-[1.8rem] flex justify-between items-center shadow-sm border border-slate-100 active:scale-[0.97] transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${t.spender === 'Santi' ? 'bg-[#007AFF]' : 'bg-[#FF2D55]'}`}>
                  {t.spender[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{t.title}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{t.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black ${t.amount > 0 ? 'text-[#34C759]' : 'text-slate-900'}`}>
                  {t.amount > 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Botón Flotante Plus */}
      <button onClick={() => setShowModal(true)} className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-slate-900 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-light z-50 border-4 border-white">
        +
      </button>

      {/* Modal de Registro */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[2.5rem] p-8 max-w-md mx-auto shadow-2xl transition-all">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-8" />
            
            {/* Selector de Usuario */}
            <div className="flex bg-[#F2F2F7] p-1 rounded-2xl mb-6">
              <button 
                onClick={() => setFormData({...formData, spender: 'Santi'})}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.spender === 'Santi' ? 'bg-[#007AFF] text-white shadow-md' : 'text-slate-400'}`}
              >Santi</button>
              <button 
                onClick={() => setFormData({...formData, spender: 'Paty'})}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.spender === 'Paty' ? 'bg-[#FF2D55] text-white shadow-md' : 'text-slate-400'}`}
              >Paty</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="text" placeholder="¿Qué compraste?" 
                className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold placeholder:text-slate-300"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              />
              <input 
                type="number" step="0.01" placeholder="Monto $0.00" 
                className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold text-2xl"
                value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setFormData({...formData, category: 'Comida'})} className={`p-4 rounded-2xl border ${formData.category === 'Comida' ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]' : 'border-slate-100'} font-bold`}>🍷 Comida</button>
                <button type="button" onClick={() => setFormData({...formData, category: 'Auto'})} className={`p-4 rounded-2xl border ${formData.category === 'Auto' ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]' : 'border-slate-100'} font-bold`}>🔧 Auto</button>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg active:scale-95 transition-all mt-4">
                Confirmar Registro
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
EOT

# 2. Subir a GitHub
git add .
git commit -m "PDfinance v1.1: Modo Santi & Paty + UX Mejorada"
git push origin main

echo "✅ App actualizada para los dos. Abriendo navegador..."
open https://pdfinance-58751.web.app
