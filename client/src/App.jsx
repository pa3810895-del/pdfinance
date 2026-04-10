import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Home, List, PieChart, Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [historyFilter, setHistoryFilter] = useState('Todos'); // Todos, Ingreso, Egreso
  const [formData, setFormData] = useState({ 
    title: '', amount: '', category: 'Comida', spender: 'Santi', type: 'Egreso', frequency: 'Aleatorio', installments: '3' 
  });

  useEffect(() => {
    // FIX PERMANENCIA: Quitamos el limit() para que las matemáticas sean exactas siempre
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  // MATEMÁTICAS GLOBALES
  const totalIncomes = transactions.filter(t => t.type === 'Ingreso').reduce((a,c) => a + Number(c.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const balanceActual = totalIncomes - totalExpenses;
  
  const totalFixedCosts = transactions.filter(t => t.type === 'Egreso' && t.frequency === 'Fijo').reduce((a,c) => a + Number(c.amount), 0);
  const casheaDebt = transactions.filter(t => t.type === 'Egreso' && t.category === 'Cashea').reduce((a,c) => a + Number(c.amount), 0);
  const saldoLibre = balanceActual - totalFixedCosts - casheaDebt;

  // LÓGICA "CUENTAS CLARAS" (Splitwise) - Asume gastos compartidos 50/50
  const santiPagos = transactions.filter(t => t.spender === 'Santi' && t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const patyPagos = transactions.filter(t => t.spender === 'Paty' && t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const totalCompartido = santiPagos + patyPagos;
  const mitad = totalCompartido / 2;
  
  let deudor = null;
  let montoDeuda = 0;
  if (santiPagos > patyPagos) {
    deudor = 'Paty';
    montoDeuda = mitad - patyPagos;
  } else if (patyPagos > santiPagos) {
    deudor = 'Santi';
    montoDeuda = mitad - santiPagos;
  }

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

  // --- COMPONENTES ---

  const HomeTab = () => (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5 mb-6">
          <div className="flex justify-between items-center mb-4">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Presupuesto Real</p>
              <span className="text-xl">☕️</span>
          </div>
          <div className="flex justify-between items-center gap-4">
              <p className="text-xs font-bold text-slate-500 leading-snug">Dinero libre tras cubrir cuotas de Cashea y Fijos:</p>
              <div className="text-right">
                  <p className={`text-2xl font-black ${saldoLibre >= 0 ? 'text-success-green' : 'text-paty-pink'}`}>\$${saldoLibre.toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{saldoLibre >= 10 ? '✅ ¡Hay para gustos!' : '⚠️ Modo Ahorro'}</p>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8 text-center font-bold">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[9px] text-slate-400 uppercase mb-1">↑ Ingresos Totales</p>
              <p className="text-lg text-success-green">\$${totalIncomes.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[9px] text-slate-400 uppercase mb-1">↓ Cashea + Fijos</p>
              <p className="text-lg text-paty-pink">\$${(totalFixedCosts + casheaDebt).toLocaleString()}</p>
          </div>
      </div>
    </div>
  );

  const HistoryTab = () => {
    const filteredData = transactions.filter(t => historyFilter === 'Todos' || t.type === historyFilter);
    
    return (
      <div className="animate-in fade-in duration-300">
        <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl mb-4 text-[10px] font-black">
          {['Todos', 'Ingreso', 'Egreso'].map(f => (
            <button key={f} onClick={() => setHistoryFilter(f)} className={`flex-1 py-2 rounded-xl transition-all ${historyFilter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        
        <div className="space-y-3 pb-6">
          {filteredData.length === 0 ? (
            <p className="text-center text-slate-400 text-sm font-bold mt-10">No hay registros aquí.</p>
          ) : (
            filteredData.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-[2rem] flex justify-between items-center shadow-sm border border-slate-50">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${t.type === 'Ingreso' ? 'bg-success-green/10' : 'bg-slate-50'}`}>
                    {t.type === 'Ingreso' ? <ArrowUpCircle className="text-success-green" size={24}/> : (t.category === 'Comida' ? '🍷' : t.category === 'Cashea' ? '📱' : t.category === 'Proyectos' ? '🚀' : t.category === 'Gym' ? '💪' : t.category === 'Alquiler' ? '🏠' : '💸')}
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
            ))
          )}
        </div>
      </div>
    );
  };

  const AnalyticsTab = () => (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Cuentas Claras</h2>
      
      {/* Widget Splitwise */}
      <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
        <h3 className="font-bold text-sm mb-1 text-slate-300">Balance de Pareja (50/50)</h3>
        {montoDeuda > 0 ? (
          <div>
            <p className="text-2xl font-black mt-2">
              <span className={deudor === 'Santi' ? 'text-santi-blue' : 'text-paty-pink'}>{deudor}</span> debe aportar:
            </p>
            <p className="text-5xl font-black mt-1 text-success-green">\$${montoDeuda.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase">Para igualar los gastos del mes.</p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-2xl font-black text-success-green">¡Están a mano!</p>
            <p className="text-xs font-bold text-slate-400 mt-1">Nadie le debe a la bolsa.</p>
          </div>
        )}
      </div>

      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Gastos Individuales</h2>
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm mb-4 flex justify-around">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-santi-blue/10 text-santi-blue flex items-center justify-center text-xl font-black mx-auto mb-2">S</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Santi Gastó</p>
            <p className="font-black text-lg text-slate-800">\$${santiPagos.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-paty-pink/10 text-paty-pink flex items-center justify-center text-xl font-black mx-auto mb-2">P</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Paty Gastó</p>
            <p className="font-black text-lg text-slate-800">\$${patyPagos.toLocaleString()}</p>
          </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 select-none text-slate-900">
      
      {/* Header Fijo */}
      <div className="max-w-md mx-auto sticky top-0 z-30 px-6 pt-12 pb-4 backdrop-blur-xl bg-[#F2F2F7]/90">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">\$${balanceActual.toLocaleString()}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capital Total</p>
          </div>
          <div className="flex -space-x-3">
             <div className="w-9 h-9 rounded-full bg-santi-blue text-white flex items-center justify-center text-xs font-black border-2 border-[#F2F2F7] shadow-sm">S</div>
             <div className="w-9 h-9 rounded-full bg-paty-pink text-white flex items-center justify-center text-xs font-black border-2 border-[#F2F2F7] shadow-sm">P</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 pt-4">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>

      {/* Menú Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-slate-100 pb-safe">
        <div className="max-w-md mx-auto px-6 py-3 flex justify-between items-center relative">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'home' ? 'text-slate-900' : 'text-slate-400'}`}>
            <Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
            <span className="text-[9px] font-bold mt-1">Inicio</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'history' ? 'text-slate-900' : 'text-slate-400'}`}>
            <List size={24} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
            <span className="text-[9px] font-bold mt-1">Historial</span>
          </button>
          <div className="w-16"></div>
          <button onClick={() => setActiveTab('analytics')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'analytics' ? 'text-slate-900' : 'text-slate-400'}`}>
            <PieChart size={24} strokeWidth={activeTab === 'analytics' ? 2.5 : 2} />
            <span className="text-[9px] font-bold mt-1">Resumen</span>
          </button>
        </div>
      </div>

      {/* Botón Flotante */}
      <button onClick={() => setShowModal(true)} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white active:scale-90 transition-all">
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* Modal - Igual que antes */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-8" />
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl">
                <button type="button" onClick={() => setFormData({...formData, spender: 'Santi'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Santi' ? 'bg-santi-blue text-white shadow-md' : 'text-slate-400'}`}>SANTI</button>
                <button type="button" onClick={() => setFormData({...formData, spender: 'Paty'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Paty' ? 'bg-paty-pink text-white shadow-md' : 'text-slate-400'}`}>PATY</button>
              </div>
              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl mb-4 text-xs">
                <button type="button" onClick={() => setFormData({...formData, type: 'Egreso'})} className={`flex-1 py-3 rounded-xl font-black ${formData.type === 'Egreso' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>EGRESO / GASTO</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'Ingreso'})} className={`flex-1 py-3 rounded-xl font-black ${formData.type === 'Ingreso' ? 'bg-success-green text-white shadow-md' : 'text-slate-400'}`}>INGRESO</button>
              </div>
              <input type="text" placeholder="¿Concepto?" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold placeholder:text-slate-300" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" step="0.01" placeholder="Monto 0.00" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-black text-4xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                {['Comida', 'Cashea', 'Auto', 'Gym', 'Alquiler', 'Internet', 'Proyectos', 'Torta'].map(cat => (
                  <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' || cat === 'Internet' ? 'Fijo' : 'Aleatorio'})} className={`p-3 rounded-xl border-2 transition-all ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white shadow-inner' : 'border-slate-100 bg-white text-slate-700'}`}>{cat}</button>
                ))}
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg active:scale-95 transition-all mt-6 shadow-xl shadow-slate-900/10">Registrar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
