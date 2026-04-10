import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Home, List, PieChart, Plus, ArrowUpCircle, Snowflake, Wallet } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [historyFilter, setHistoryFilter] = useState('Todos');
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  // Formulario extendido con 'account' (Billetera)
  const [formData, setFormData] = useState({ 
    title: '', amount: '', initialPayment: '', category: 'Comida', spender: 'Santi', type: 'Egreso', frequency: 'Aleatorio', installments: '3', account: 'Binance'
  });

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  // --- MATEMÁTICAS GLOBALES ---
  const totalIncomes = transactions.filter(t => t.type === 'Ingreso').reduce((a,c) => a + Number(c.amount), 0);
  const gastosEfectivos = transactions.filter(t => t.type === 'Egreso').reduce((a,c) => {
    if (c.category === 'Cashea') return a + Number(c.initialPayment || c.amount);
    return a + Number(c.amount);
  }, 0);

  const capitalEnBanco = totalIncomes - gastosEfectivos;

  const dineroCongelado = transactions.filter(t => t.type === 'Egreso' && t.category === 'Cashea').reduce((a,c) => {
    const total = Number(c.amount);
    const pagado = Number(c.initialPayment || total);
    return a + (total - pagado);
  }, 0);

  const totalFixedCosts = transactions.filter(t => t.type === 'Egreso' && t.frequency === 'Fijo').reduce((a,c) => a + Number(c.amount), 0);
  const saldoLibre = capitalEnBanco - dineroCongelado - totalFixedCosts;

  // --- SALDOS POR CUENTA (BILLETERAS) ---
  const getAccountBalance = (accName) => {
    const incomes = transactions.filter(t => t.type === 'Ingreso' && t.account === accName).reduce((a,c) => a + Number(c.amount), 0);
    const expenses = transactions.filter(t => t.type === 'Egreso' && t.account === accName).reduce((a,c) => {
       if (c.category === 'Cashea') return a + Number(c.initialPayment || c.amount);
       return a + Number(c.amount);
    }, 0);
    return incomes - expenses;
  };

  const balances = {
    Binance: getAccountBalance('Binance'),
    BCP: getAccountBalance('BCP'),
    BDV: getAccountBalance('BDV')
  };

  // --- CEREBRO DINÁMICO (Inteligencia Artificial Simulada) ---
  const getDynamicMessage = () => {
    if (saldoLibre < 0) return { msg: "⚠️ Alerta Roja: Presupuesto en negativo.", icon: "🆘", style: "text-paty-pink animate-pulse" };
    if (saldoLibre === 0) return { msg: "Al ras. Ni un café más.", icon: "🧊", style: "text-slate-400" };
    if (saldoLibre < 50) return { msg: "Modo Supervivencia: Solo arepas 🫓", icon: "⚠️", style: "text-orange-400" };
    if (saldoLibre >= 50 && saldoLibre < 200) return { msg: "Tranquilidad. Hay para gustos ✅", icon: "☕️", style: "text-success-green" };
    if (saldoLibre >= 200) return { msg: "Modo Rockefeller activado 🎩✨", icon: "🚀", style: "text-[#007AFF]" };
    return { msg: "Calculando...", icon: "🤔", style: "text-slate-400" };
  };
  const aiMessage = getDynamicMessage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    
    // Easter Egg Check
    if (Number(formData.amount) === 3.14 && formData.category === 'Comida') {
        setShowEasterEgg(true);
        setTimeout(() => setShowEasterEgg(false), 4000);
    }

    const dataToSave = { ...formData, amount: Number(formData.amount), date: Timestamp.now() };
    if (formData.category === 'Cashea' && formData.initialPayment) {
      dataToSave.initialPayment = Number(formData.initialPayment);
    } else {
      dataToSave.initialPayment = Number(formData.amount);
    }

    await addDoc(collection(db, "transactions"), dataToSave);
    
    // Resetear formulario manteniendo la cuenta seleccionada para agilidad
    setFormData({ ...formData, title: '', amount: '', initialPayment: '' });
    setShowModal(false);
  };

  // --- COMPONENTES ---

  const HomeTab = () => (
    <div className="animate-in fade-in duration-300">
      
      {/* Tarjeta de Decisión (Dinámica) */}
      <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden border-4 border-slate-800">
          <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Libre Mágico</p>
              <span className="text-2xl">{aiMessage.icon}</span>
          </div>
          <div className="relative z-10">
            <p className={`text-5xl font-black tracking-tighter ${saldoLibre >= 0 ? 'text-success-green' : 'text-paty-pink'}`}>
              \$${saldoLibre.toLocaleString()}
            </p>
            <p className={`text-[10px] font-bold mt-3 uppercase tracking-wider ${aiMessage.style}`}>
              {aiMessage.msg}
            </p>
          </div>
      </div>

      {/* Billeteras (Cuentas) */}
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Distribución de Capital</h2>
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 hide-scrollbar">
          <div className="min-w-[120px] bg-[#F3BA2F]/10 border border-[#F3BA2F]/30 p-4 rounded-3xl flex-shrink-0">
             <p className="text-[10px] font-black text-[#F3BA2F] uppercase mb-1 flex items-center gap-1"><Wallet size={12}/> Binance</p>
             <p className="font-black text-lg text-slate-800">\$${balances.Binance.toLocaleString()}</p>
          </div>
          <div className="min-w-[120px] bg-[#FF7A00]/10 border border-[#FF7A00]/30 p-4 rounded-3xl flex-shrink-0">
             <p className="text-[10px] font-black text-[#FF7A00] uppercase mb-1 flex items-center gap-1"><Wallet size={12}/> BCP</p>
             <p className="font-black text-lg text-slate-800">\$${balances.BCP.toLocaleString()}</p>
          </div>
          <div className="min-w-[120px] bg-paty-pink/10 border border-paty-pink/30 p-4 rounded-3xl flex-shrink-0">
             <p className="text-[10px] font-black text-paty-pink uppercase mb-1 flex items-center gap-1"><Wallet size={12}/> BDV</p>
             <p className="font-black text-lg text-slate-800">\$${balances.BDV.toLocaleString()}</p>
          </div>
      </div>

      {/* Bóvedas de Congelamiento */}
      <div className="grid grid-cols-2 gap-3 mb-8 text-center font-bold">
          <div className="bg-[#007AFF]/5 p-5 rounded-3xl border border-[#007AFF]/10 shadow-sm relative overflow-hidden">
              <Snowflake className="absolute -right-3 -top-3 text-[#007AFF] opacity-5" size={80} />
              <p className="text-[9px] text-[#007AFF] font-black uppercase mb-1">❄️ Congelado Cashea</p>
              <p className="text-xl text-[#007AFF] font-black">\$${dineroCongelado.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[9px] text-slate-400 uppercase mb-1">🏠 Gastos Fijos</p>
              <p className="text-xl text-slate-800 font-black">\$${totalFixedCosts.toLocaleString()}</p>
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
            <button key={f} onClick={() => setHistoryFilter(f)} className={`flex-1 py-2 rounded-xl transition-all ${historyFilter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>{f.toUpperCase()}</button>
          ))}
        </div>
        <div className="space-y-3 pb-6">
          {filteredData.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-50 relative overflow-hidden">
              {/* Indicador de cuenta lateral */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.account === 'Binance' ? 'bg-[#F3BA2F]' : t.account === 'BCP' ? 'bg-[#FF7A00]' : 'bg-paty-pink'}`}></div>
              
              <div className="flex justify-between items-center pl-2">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${t.type === 'Ingreso' ? 'bg-success-green/10' : t.category === 'Cashea' ? 'bg-[#007AFF]/10' : 'bg-slate-50'}`}>
                    {t.type === 'Ingreso' ? <ArrowUpCircle className="text-success-green" size={24}/> : (t.category === 'Comida' ? '🍷' : t.category === 'Cashea' ? '📱' : t.category === 'Proyectos' ? '🚀' : '💸')}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-slate-800">{t.title}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{t.spender} • {t.category} • {t.account}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-success-green' : 'text-slate-900'}`}>
                    {t.type === 'Ingreso' ? '+' : '-'}\$${Math.abs(t.amount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const AnalyticsTab = () => (
     <div className="animate-in fade-in duration-300">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">En construcción 🚧</h2>
        <p className="text-sm text-slate-500 px-2">Aquí vendrán gráficos avanzados próximamente.</p>
     </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 select-none text-slate-900">
      
      {/* Easter Egg Overlay */}
      {showEasterEgg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className="text-center">
                <p className="text-8xl animate-bounce">🥧</p>
                <h1 className="text-white font-black text-4xl mt-4">¡DÍA DE PI!</h1>
                <p className="text-slate-300 font-bold mt-2">Encontraste el Easter Egg, Santi.</p>
            </div>
        </div>
      )}

      <div className="max-w-md mx-auto sticky top-0 z-30 px-6 pt-12 pb-4 backdrop-blur-xl bg-[#F2F2F7]/90">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">\$${capitalEnBanco.toLocaleString()}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capital Total Real</p>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 pt-4">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-slate-100 pb-safe">
        <div className="max-w-md mx-auto px-6 py-3 flex justify-between items-center relative">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-slate-900' : 'text-slate-400'}`}><Home size={24} /><span className="text-[9px] font-bold mt-1">Inicio</span></button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center p-2 ${activeTab === 'history' ? 'text-slate-900' : 'text-slate-400'}`}><List size={24} /><span className="text-[9px] font-bold mt-1">Historial</span></button>
          <div className="w-16"></div>
          <button onClick={() => setActiveTab('analytics')} className={`flex flex-col items-center p-2 ${activeTab === 'analytics' ? 'text-slate-900' : 'text-slate-400'}`}><PieChart size={24} /><span className="text-[9px] font-bold mt-1">Resumen</span></button>
        </div>
      </div>

      <button onClick={() => setShowModal(true)} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white active:scale-90 transition-all">
        <Plus size={28} strokeWidth={3} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl text-xs mb-2">
                <button type="button" onClick={() => setFormData({...formData, type: 'Egreso', category: 'Comida'})} className={`flex-1 py-3 rounded-xl font-black ${formData.type === 'Egreso' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>GASTO</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'Ingreso', category: 'Sueldo'})} className={`flex-1 py-3 rounded-xl font-black ${formData.type === 'Ingreso' ? 'bg-success-green text-white shadow-md' : 'text-slate-400'}`}>INGRESO</button>
              </div>

              {/* Selector de Billetera */}
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2">Billetera / Cuenta</p>
                 <div className="flex gap-2">
                    {['Binance', 'BCP', 'BDV'].map(acc => (
                        <button key={acc} type="button" onClick={() => setFormData({...formData, account: acc})} className={`flex-1 py-3 rounded-2xl font-black text-xs border-2 transition-all ${formData.account === acc ? (acc === 'Binance' ? 'border-[#F3BA2F] text-[#F3BA2F] bg-[#F3BA2F]/10' : acc === 'BCP' ? 'border-[#FF7A00] text-[#FF7A00] bg-[#FF7A00]/10' : 'border-paty-pink text-paty-pink bg-paty-pink/10') : 'border-transparent bg-[#F2F2F7] text-slate-400'}`}>
                            {acc}
                        </button>
                    ))}
                 </div>
              </div>

              <input type="text" placeholder="¿Concepto?" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" step="0.01" placeholder="Monto Total $" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-black text-4xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />

              {/* Categorías Dinámicas según Ingreso/Egreso */}
              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
                {formData.type === 'Egreso' 
                  ? ['Comida', 'Cashea', 'Auto', 'Gym', 'Alquiler', 'Torta'].map(cat => (
                      <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' ? 'Fijo' : 'Aleatorio'})} className={`p-3 rounded-xl border-2 transition-all ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white'}`}>{cat}</button>
                    ))
                  : ['Sueldo', 'Proyecto', 'Extra'].map(cat => (
                      <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat})} className={`p-3 rounded-xl border-2 transition-all ${formData.category === cat ? 'border-success-green bg-success-green text-white' : 'border-slate-100 bg-white'}`}>{cat}</button>
                    ))
                }
              </div>

              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl mt-4">
                <button type="button" onClick={() => setFormData({...formData, spender: 'Santi'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Santi' ? 'bg-santi-blue text-white shadow-md' : 'text-slate-400'}`}>SANTI</button>
                <button type="button" onClick={() => setFormData({...formData, spender: 'Paty'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Paty' ? 'bg-paty-pink text-white shadow-md' : 'text-slate-400'}`}>PATY</button>
              </div>

              {formData.category === 'Cashea' && formData.type === 'Egreso' && (
                <div className="p-4 bg-santi-blue/5 rounded-2xl border border-santi-blue/20 mt-4">
                  <input type="number" step="0.01" placeholder="¿Cuánto pagaste de inicial? $" className="w-full bg-white p-3 rounded-xl outline-none font-bold text-santi-blue text-sm border border-slate-100" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />
                </div>
              )}

              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg active:scale-95 transition-all shadow-xl mt-4">Registrar Movimiento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
