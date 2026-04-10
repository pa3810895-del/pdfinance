import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    amount: '', 
    category: 'Comida', 
    spender: 'Santi', 
    type: 'Egreso', 
    frequency: 'Aleatorio' 
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

  // Lógica de Finanzas Reales
  const totalIncomes = transactions.filter(t => t.type === 'Ingreso').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'Egreso').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const fixedExpenses = transactions.filter(t => t.type === 'Egreso' && t.frequency === 'Fijo').reduce((acc, curr) => acc + Number(curr.amount), 0);
  
  const balanceActual = totalIncomes - totalExpenses;
  const saldoLibre = balanceActual; // Aquí podríamos restar gastos fijos pendientes si quisiéramos

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
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-36 select-none text-slate-900">
      
      {/* Dashboard de Control */}
      <div className="max-w-md mx-auto sticky top-0 z-40 px-6 pt-12 pb-6 backdrop-blur-2xl bg-[#F2F2F7]/90 border-b border-slate-200">
        <header className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">\$${balanceActual.toLocaleString()}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance General Real</p>
          </div>
          <div className="flex -space-x-2">
             <div className="w-9 h-9 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-xs font-black border-2 border-[#F2F2F7] shadow-sm">S</div>
             <div className="w-9 h-9 rounded-full bg-[#FF2D55] text-white flex items-center justify-center text-xs font-black border-2 border-[#F2F2F7] shadow-sm">P</div>
          </div>
        </header>

        {/* Módulos de Análisis */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-[9px] font-black text-[#34C759] uppercase mb-1">↑ Ingresos</p>
            <p className="text-lg font-bold">\$${totalIncomes.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-[9px] font-black text-[#FF3B30] uppercase mb-1">↓ Gastos Fijos</p>
            <p className="text-lg font-bold">\$${fixedExpenses.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Lista de Movimientos */}
      <main className="max-w-md mx-auto px-6 mt-6">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Cronología de Flujo</h2>
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-[2rem] flex justify-between items-center shadow-sm border border-slate-50 active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${t.type === 'Ingreso' ? 'bg-[#34C759]/10' : 'bg-slate-50'}`}>
                  {t.category === 'Comida' ? '🍷' : t.category === 'Auto' ? '🔧' : t.category === 'Proyectos' ? '🚀' : t.category === 'Cache' ? '📱' : '💸'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm leading-tight text-slate-800">{t.title}</h3>
                    {t.frequency === 'Fijo' && <span className="bg-slate-100 text-[8px] px-1.5 py-0.5 rounded-full font-bold text-slate-400">FIJO</span>}
                  </div>
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

      {/* Botón de Acción */}
      <button onClick={() => setShowModal(true)} className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light z-50 border-4 border-white active:scale-90 transition-all">
        +
      </button>

      {/* Modal Pro de Registro */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            
            {/* Toggle Ingreso/Egreso */}
            <div className="flex bg-[#F2F2F7] p-1 rounded-2xl mb-4 text-xs">
              <button onClick={() => setFormData({...formData, type: 'Ingreso'})} className={`flex-1 py-3 rounded-xl font-black ${formData.type === 'Ingreso' ? 'bg-[#34C759] text-white shadow-md' : 'text-slate-400'}`}>INGRESO</button>
              <button onClick={() => setFormData({...formData, type: 'Egreso'})} className={`flex-1 py-3 rounded-xl font-black ${formData.type === 'Egreso' ? 'bg-[#FF3B30] text-white shadow-md' : 'text-slate-400'}`}>EGRESO</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setFormData({...formData, spender: 'Santi'})} className={`flex-1 py-3 rounded-xl font-bold border-2 ${formData.spender === 'Santi' ? 'border-[#007AFF] text-[#007AFF]' : 'border-transparent bg-[#F2F2F7]'}`}>Santi</button>
                <button type="button" onClick={() => setFormData({...formData, spender: 'Paty'})} className={`flex-1 py-3 rounded-xl font-bold border-2 ${formData.spender === 'Paty' ? 'border-[#FF2D55] text-[#FF2D55]' : 'border-transparent bg-[#F2F2F7]'}`}>Paty</button>
              </div>

              <input type="text" placeholder="¿Concepto?" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" step="0.01" placeholder="Monto 0.00" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-black text-3xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />

              {/* Categorías Específicas */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                {['Comida', 'Auto', 'Proyectos', 'Cache', 'Alquiler', 'Internet'].map(cat => (
                  <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat})} className={`p-3 rounded-xl border-2 ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100'}`}>{cat}</button>
                ))}
              </div>

              {/* Fijo vs Aleatorio */}
              <div className="flex gap-4 items-center justify-center pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <input type="checkbox" checked={formData.frequency === 'Fijo'} onChange={(e) => setFormData({...formData, frequency: e.target.checked ? 'Fijo' : 'Aleatorio'})} className="w-5 h-5 accent-slate-900" />
                  PAGO FIJO REGULAR
                </label>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all">Registrar Flujo</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
