import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', amount: '', category: 'Comida', spender: 'Santi', type: 'Egreso', frequency: 'Aleatorio', installments: '3' 
  });

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(60));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  // Lógica Avanzada de PDfinance Pro
  const totalIncomes = transactions.filter(t => t.type === 'Ingreso').reduce((a,c) => a + Number(c.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const balanceActual = totalIncomes - totalExpenses;
  
  const totalFixedCosts = transactions.filter(t => t.type === 'Egreso' && t.frequency === 'Fijo').reduce((a,c) => a + Number(c.amount), 0);
  const casheaDebt = transactions.filter(t => t.type === 'Egreso' && t.category === 'Cashea').reduce((a,c) => a + Number(c.amount), 0);
  
  const saldoLibre = balanceActual - totalFixedCosts - casheaDebt;

  // FUNCIÓN MÁGICA PARA LA IA (Review Mode)
  const copyDebugInfo = () => {
    const report = {
      t: new Date().toISOString(),
      b: balanceActual,
      s: {
        Santi: transactions.filter(t => t.spender === 'Santi').reduce((a,c) => a + Number(c.amount), 0),
        Paty: transactions.filter(t => t.spender === 'Paty').reduce((a,c) => a + Number(c.amount), 0)
      },
      fcosts: totalFixedCosts,
      cdebt: casheaDebt,
      cats: [...new Set(transactions.map(t => t.category))],
      rdata: transactions.slice(0, 5).map(t => ({ t: t.title, a: t.amount, s: t.spender })),
      cnt: transactions.length
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    alert("🚀 Datos de PDfinance Pro copiados. ¡Pégalos en el chat de la IA!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    await addDoc(collection(db, "transactions"), {
      ...formData,
      amount: Number(formData.amount),
      date: Timestamp.now()
    });
    setFormData({ ...formData, title: '', amount: '' });
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-40 select-none text-slate-900">
      
      {/* Botón Invisible para la IA */}
      <button onClick={copyDebugInfo} className="fixed bottom-4 left-4 w-10 h-10 opacity-[0.02] z-[100]">🛠️</button>

      {/* Header Premium de Control */}
      <div className="max-w-md mx-auto sticky top-0 z-40 px-6 pt-12 pb-6 backdrop-blur-2xl bg-[#F2F2F7]/90 border-b border-slate-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">\$${balanceActual.toLocaleString()}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Compartido Reales</p>
          </div>
          <div className="flex -space-x-4">
             <div className="w-11 h-11 rounded-full bg-santi-blue text-white flex items-center justify-center text-xs font-black border-4 border-[#F2F2F7] shadow-sm">S</div>
             <div className="w-11 h-11 rounded-full bg-paty-pink text-white flex items-center justify-center text-xs font-black border-4 border-[#F2F2F7] shadow-sm">P</div>
          </div>
        </div>

        {/* Tarjeta de Control Diario */}
        <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5">
            <div className="flex justify-between items-center mb-4">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Control para Paty</p>
                <span className="text-xl">☕️</span>
            </div>
            <div className="flex justify-between items-center gap-4">
                <p className="text-xs font-bold text-slate-500 leading-snug">Después de pagar Cashea y gastos fijos, les queda libre:</p>
                <div className="text-right">
                    <p className={`text-2xl font-black ${saldoLibre >= 0 ? 'text-success-green' : 'text-paty-pink'}`}>\$${saldoLibre.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">¿Café o torta? {saldoLibre >= 10 ? '✅ ¡Sí!' : '⚠️ Mejor no'}</p>
                </div>
            </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 pt-6">
        <div className="grid grid-cols-2 gap-3 mb-8 text-center font-bold">
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[9px] text-slate-400 uppercase mb-1">↑ Ingresos</p>
                <p className="text-lg text-success-green">\$${totalIncomes.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[9px] text-slate-400 uppercase mb-1">↓ Cashea + Fijos</p>
                <p className="text-lg text-paty-pink">\$${(totalFixedCosts + casheaDebt).toLocaleString()}</p>
            </div>
        </div>

        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Cronología de Flujo</h2>
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-[2rem] flex justify-between items-center shadow-sm border border-slate-50 active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${t.type === 'Ingreso' ? 'bg-[#34C759]/10' : 'bg-slate-50'}`}>
                  {t.category === 'Comida' ? '🍷' : t.category === 'Cashea' ? '📱' : t.category === 'Proyectos' ? '🚀' : t.category === 'Gym' ? '💪' : t.category === 'Alquiler' ? '🏠' : '💸'}
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight text-slate-800">{t.title}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{t.spender} • {t.category}</p>
                </div>
              </div>
              <span className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-success-green' : 'text-slate-900'}`}>
                {t.type === 'Ingreso' ? '+' : '-'}\$${Math.abs(t.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </main>

      <button onClick={() => setShowModal(true)} className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light z-50 border-4 border-white active:scale-90 transition-all">+</button>

      {/* Modal Pro de Registro */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-8" />
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl">
                <button type="button" onClick={() => setFormData({...formData, spender: 'Santi'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Santi' ? 'bg-santi-blue text-white shadow-md' : 'text-slate-400'}`}>SANTI</button>
                <button type="button" onClick={() => setFormData({...formData, spender: 'Paty'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Paty' ? 'bg-paty-pink text-white shadow-md' : 'text-slate-400'}`}>PATY / PATO</button>
              </div>

              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl mb-4 text-xs">
                <button type="button" onClick={() => setFormData({...formData, type: 'Egreso'})} className={`flex-1 py-3 rounded-xl font-black ${formData.type === 'Egreso' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>EGRESO / GASTO</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'Ingreso'})} className={`flex-1 py-3 rounded-xl font-black ${formData.type === 'Ingreso' ? 'bg-success-green text-white shadow-md' : 'text-slate-400'}`}>INGRESO</button>
              </div>

              <input type="text" placeholder="¿Concepto?" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold placeholder:text-slate-300" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" step="0.01" placeholder="Monto 0.00" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-black text-4xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />

              {/* Categorías Específicas */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                {['Comida', 'Cashea', 'Auto', 'Gym', 'Alquiler', 'Internet', 'Proyectos', 'Torta'].map(cat => (
                  <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' || cat === 'Internet' ? 'Fijo' : 'Aleatorio'})} className={`p-3 rounded-xl border-2 transition-all ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white shadow-inner' : 'border-slate-100 bg-white text-slate-700'}`}>{cat}</button>
                ))}
              </div>

              {formData.category === 'Cashea' && (
                <div className="p-4 bg-santi-blue/5 rounded-2xl border border-santi-blue/10">
                  <p className="text-[10px] font-black text-santi-blue uppercase mb-2">Plan de Cuotas Cashea</p>
                  <select className="w-full bg-white p-3 rounded-xl font-bold border border-slate-100 outline-none" value={formData.installments} onChange={e => setFormData({...formData, installments: e.target.value})}>
                    <option value="3">3 Cuotas (Cada 14 días)</option>
                    <option value="6">6 Cuotas (Cada 14 días)</option>
                  </select>
                </div>
              )}

              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg active:scale-95 transition-all mt-6 shadow-xl shadow-slate-900/10">Registrar Flujo Reales</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
