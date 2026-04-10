import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', amount: '', category: 'Cashea', spender: 'Santi', type: 'Egreso', frequency: 'Cuotas', installments: '3' 
  });

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(40));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  const totalIncomes = transactions.filter(t => t.type === 'Ingreso').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'Egreso').reduce((acc, curr) => acc + Number(curr.amount), 0);
  
  // Próximos Pagos de Cashea (Simulación basada en 14 días)
  const casheaPayments = transactions.filter(t => t.category === 'Cashea' && t.type === 'Egreso');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    await addDoc(collection(db, "transactions"), {
      ...formData,
      amount: Number(formData.amount),
      date: new Date().toISOString(),
      nextPayment: formData.frequency === 'Cuotas' ? new Date(Date.now() + 1209600000).toISOString() : null
    });
    setFormData({ ...formData, title: '', amount: '' });
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-40 select-none text-slate-900">
      
      {/* Header Premium */}
      <div className="max-w-md mx-auto sticky top-0 z-40 px-6 pt-12 pb-6 backdrop-blur-2xl bg-[#F2F2F7]/90 border-b border-slate-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">\$${(totalIncomes - totalExpenses).toLocaleString()}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Compartido</p>
          </div>
          <div className="flex -space-x-3">
             <div className="w-10 h-10 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-xs font-black border-4 border-[#F2F2F7]">S</div>
             <div className="w-10 h-10 rounded-full bg-[#FF2D55] text-white flex items-center justify-center text-xs font-black border-4 border-[#F2F2F7]">P</div>
          </div>
        </div>

        {/* Alerta de Cashea */}
        {casheaPayments.length > 0 && (
          <div className="bg-[#007AFF]/10 border border-[#007AFF]/20 p-3 rounded-2xl flex items-center gap-3 animate-pulse">
            <span className="text-xl">🔔</span>
            <div className="text-[10px] font-bold text-[#007AFF]">
              RECORDATORIO: Tienes cuotas de Cashea pendientes.
            </div>
          </div>
        )}
      </div>

      <main className="max-w-md mx-auto px-6 pt-6">
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase">Fijos (Alquiler/Net)</p>
            <p className="text-lg font-black">\$${transactions.filter(t => t.frequency === 'Fijo').reduce((a,c) => a+c.amount, 0).toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase">Cashea (Cuotas)</p>
            <p className="text-lg font-black">\$${casheaPayments.reduce((a,c) => a+c.amount, 0).toLocaleString()}</p>
          </div>
        </div>

        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Movimientos Reales</h2>
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-[2rem] flex justify-between items-center shadow-sm border border-slate-50 active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${t.category === 'Cashea' ? 'bg-[#007AFF]/10' : 'bg-slate-50'}`}>
                  {t.category === 'Cashea' ? '📱' : t.category === 'Comida' ? '🍷' : t.category === 'Proyectos' ? '🚀' : '💸'}
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight text-slate-800">{t.title}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{t.spender} • {t.frequency === 'Cuotas' ? 'Cuota Cashea' : t.frequency}</p>
                </div>
              </div>
              <span className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-[#34C759]' : 'text-slate-900'}`}>
                {t.type === 'Ingreso' ? '+' : '-'}\$${Math.abs(t.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </main>

      <button onClick={() => setShowModal(true)} className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light z-50 border-4 border-white active:scale-90 transition-all">
        +
      </button>

      {/* Modal Cashea Ready */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3.5rem] p-8 max-w-md mx-auto shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl">
                <button type="button" onClick={() => setFormData({...formData, spender: 'Santi'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Santi' ? 'bg-[#007AFF] text-white shadow-md' : 'text-slate-400'}`}>SANTI</button>
                <button type="button" onClick={() => setFormData({...formData, spender: 'Paty'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Paty' ? 'bg-[#FF2D55] text-white shadow-md' : 'text-slate-400'}`}>PATY</button>
              </div>

              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl">
                <button type="button" onClick={() => setFormData({...formData, type: 'Egreso'})} className={`flex-1 py-2 rounded-xl font-black text-[10px] ${formData.type === 'Egreso' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>EGRESO</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'Ingreso'})} className={`flex-1 py-2 rounded-xl font-black text-[10px] ${formData.type === 'Ingreso' ? 'bg-[#34C759] text-white' : 'text-slate-400'}`}>INGRESO</button>
              </div>

              <input type="text" placeholder="Concepto (ej: Zapatos Daka)" className="w-full bg-[#F2F2F7] p-5 rounded-3xl outline-none font-bold text-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" step="0.01" placeholder="Monto total $" className="w-full bg-[#F2F2F7] p-5 rounded-3xl outline-none font-black text-4xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />

              <div className="grid grid-cols-3 gap-2">
                {['Cashea', 'Comida', 'Auto', 'Proyectos', 'Fijo'].map(c => (
                  <button key={c} type="button" onClick={() => setFormData({...formData, category: c, frequency: c === 'Fijo' ? 'Fijo' : c === 'Cashea' ? 'Cuotas' : 'Aleatorio'})} className={`py-3 rounded-2xl border-2 font-bold text-[10px] ${formData.category === c ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white'}`}>{c}</button>
                ))}
              </div>

              {formData.category === 'Cashea' && (
                <div className="p-4 bg-[#007AFF]/5 rounded-3xl border border-[#007AFF]/10">
                  <p className="text-[10px] font-black text-[#007AFF] uppercase mb-2">Plan de Cuotas</p>
                  <select className="w-full bg-white p-3 rounded-xl font-bold outline-none border border-slate-100" value={formData.installments} onChange={e => setFormData({...formData, installments: e.target.value})}>
                    <option value="3">3 Cuotas (Cada 14 días)</option>
                    <option value="6">6 Cuotas (Cada 14 días)</option>
                  </select>
                </div>
              )}

              <button type="submit" className="w-full bg-slate-900 text-white p-6 rounded-[2.5rem] font-black text-xl shadow-xl active:scale-95 transition-all">Registrar Movimiento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
