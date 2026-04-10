import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', amount: '', category: 'Comida', spender: 'Santi', type: 'Egreso', frequency: 'Aleatorio' 
  });

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  const totalIncomes = transactions.filter(t => t.type === 'Ingreso').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'Egreso').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const balanceActual = totalIncomes - totalExpenses;

  // FUNCIÓN MÁGICA PARA LA IA (Review Mode)
  const copyDebugInfo = () => {
    const report = {
      timestamp: new Date().toISOString(),
      currentBalance: balanceActual,
      stats: {
        Santi: transactions.filter(t => t.spender === 'Santi').reduce((a,c) => a + Number(c.amount), 0),
        Paty: transactions.filter(t => t.spender === 'Paty').reduce((a,c) => a + Number(c.amount), 0)
      },
      categories: [...new Set(transactions.map(t => t.category))],
      recentData: transactions.slice(0, 5).map(t => ({ t: t.title, a: t.amount, s: t.spender })),
      rawCount: transactions.length
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    alert("🚀 Datos de PDfinance copiados. ¡Pégalos en el chat de la IA!");
  };

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
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-40 select-none text-slate-900">
      
      {/* Botón Invisible para la IA (Esquina inferior izquierda) */}
      <button 
        onClick={copyDebugInfo}
        className="fixed bottom-4 left-4 w-10 h-10 opacity-[0.02] z-[100] active:opacity-100 transition-opacity"
      >
        🛠️
      </button>

      <div className="max-w-md mx-auto sticky top-0 z-40 px-6 pt-12 pb-6 backdrop-blur-2xl bg-[#F2F2F7]/90 border-b border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">\$${balanceActual.toLocaleString()}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Santi & Paty</p>
          </div>
          <div className="flex -space-x-3">
             <div className="w-10 h-10 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-xs font-black border-4 border-[#F2F2F7]">S</div>
             <div className="w-10 h-10 rounded-full bg-[#FF2D55] text-white flex items-center justify-center text-xs font-black border-4 border-[#F2F2F7]">P</div>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 pt-6">
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-[2rem] flex justify-between items-center shadow-sm border border-slate-50">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${t.category === 'Cashea' ? 'bg-[#007AFF]/10' : 'bg-slate-50'}`}>
                  {t.category === 'Cashea' ? '📱' : t.category === 'Comida' ? '🍷' : '💸'}
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight text-slate-800">{t.title}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{t.spender} • {t.category}</p>
                </div>
              </div>
              <span className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-[#34C759]' : 'text-slate-900'}`}>
                {t.type === 'Ingreso' ? '+' : '-'}\$${Math.abs(t.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </main>

      <button onClick={() => setShowModal(true)} className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl z-50 border-4 border-white active:scale-90 transition-all">+</button>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl">
                <button type="button" onClick={() => setFormData({...formData, spender: 'Santi'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Santi' ? 'bg-[#007AFF] text-white shadow-md' : 'text-slate-400'}`}>SANTI</button>
                <button type="button" onClick={() => setFormData({...formData, spender: 'Paty'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Paty' ? 'bg-[#FF2D55] text-white shadow-md' : 'text-slate-400'}`}>PATY</button>
              </div>
              <input type="text" placeholder="Concepto" className="w-full bg-[#F2F2F7] p-5 rounded-3xl outline-none font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" step="0.01" placeholder="Monto $" className="w-full bg-[#F2F2F7] p-5 rounded-3xl outline-none font-black text-3xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              <button type="submit" className="w-full bg-slate-900 text-white p-6 rounded-[2.5rem] font-black text-xl shadow-xl">Registrar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
