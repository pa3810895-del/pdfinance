import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Home, List, PieChart, Plus, ArrowUpCircle, Snowflake, Wallet, TrendingUp, X, Activity } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [depositWallet, setDepositWallet] = useState(null);
  const [depositForm, setDepositForm] = useState({ amount: '', spender: 'Santi', category: 'Freelance' });
  const [activeTab, setActiveTab] = useState('home');
  const [historyFilter, setHistoryFilter] = useState('Todos');
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  // --- NUEVO: ESTADO DE APIs EN TIEMPO REAL ---
  const [rates, setRates] = useState({ bcv: 36.50, paralelo: 39.10, pen: 3.75 }); // Valores de respaldo
  const [isLive, setIsLive] = useState(false);

  const [formData, setFormData] = useState({ 
    title: '', amount: '', initialPayment: '', category: 'Comida', spender: 'Santi', type: 'Egreso', frequency: 'Aleatorio', installments: '3', account: 'Binance'
  });

  // Efecto para consultar las APIs al abrir la app
  useEffect(() => {
    const fetchRates = async () => {
      try {
        // API 1: Soles Peruanos
        const peRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const peData = await peRes.json();
        
        // API 2: Venezuela (BCV y Paralelo)
        const veRes = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar');
        const veData = await veRes.json();

        setRates({
          bcv: veData.monitors.bcv.price || 36.50,
          paralelo: veData.monitors.enparalelovzla.price || 39.10,
          pen: peData.rates.PEN || 3.75
        });
        setIsLive(true);
      } catch (error) {
        console.warn("⚠️ Usando tasas offline de respaldo.");
      }
    };

    fetchRates();
    // Actualizar cada 10 minutos automáticamente
    const interval = setInterval(fetchRates, 600000); 
    return () => clearInterval(interval);
  }, []);

  // Base de datos Firestore
  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  // --- MATEMÁTICAS ---
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

  const getAccountBalance = (accName) => {
    const incomes = transactions.filter(t => t.type === 'Ingreso' && t.account === accName).reduce((a,c) => a + Number(c.amount), 0);
    const expenses = transactions.filter(t => t.type === 'Egreso' && t.account === accName).reduce((a,c) => {
       if (c.category === 'Cashea') return a + Number(c.initialPayment || c.amount);
       return a + Number(c.amount);
    }, 0);
    return incomes - expenses;
  };

  const balances = { Binance: getAccountBalance('Binance'), BCP: getAccountBalance('BCP'), BDV: getAccountBalance('BDV') };

  // Diccionario Dinámico de Tasas basado en la API
  const exchangeRates = {
    Binance: { rate: rates.paralelo, currency: 'Bs', label: 'Mercado P2P' },
    BDV: { rate: rates.bcv, currency: 'Bs', label: 'Oficial BCV' },
    BCP: { rate: rates.pen, currency: 'S/', label: 'Soles' }
  };

  const aiMessage = () => {
    if (saldoLibre < 0) return { msg: "⚠️ Alerta Roja: Presupuesto en negativo.", icon: "🆘", style: "text-paty-pink animate-pulse" };
    if (saldoLibre === 0) return { msg: "Al ras. Ni un café más.", icon: "🧊", style: "text-slate-400" };
    if (saldoLibre < 50) return { msg: "Modo Supervivencia: Solo arepas 🫓", icon: "⚠️", style: "text-orange-400" };
    if (saldoLibre >= 50 && saldoLibre < 200) return { msg: "Tranquilidad. Hay para gustos ✅", icon: "☕️", style: "text-success-green" };
    if (saldoLibre >= 200) return { msg: "Modo Rockefeller activado 🎩✨", icon: "🚀", style: "text-[#007AFF]" };
    return { msg: "Calculando...", icon: "🤔", style: "text-slate-400" };
  }();

  // --- HANDLERS ---
  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    
    if (Number(formData.amount) === 3.14 && formData.category === 'Comida') {
        setShowEasterEgg(true);
        setTimeout(() => setShowEasterEgg(false), 4000);
    }

    const dataToSave = { ...formData, amount: Number(formData.amount), date: Timestamp.now() };
    if (formData.category === 'Cashea' && formData.initialPayment) dataToSave.initialPayment = Number(formData.initialPayment);
    else dataToSave.initialPayment = Number(formData.amount);

    setShowModal(false); 
    setFormData({ title: '', amount: '', initialPayment: '', category: 'Comida', spender: formData.spender, type: 'Egreso', frequency: 'Aleatorio', installments: '3', account: formData.account });
    await addDoc(collection(db, "transactions"), dataToSave);
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositForm.amount) return;

    const dataToSave = {
      title: `Ingreso ${depositForm.category}`,
      amount: Number(depositForm.amount),
      initialPayment: Number(depositForm.amount),
      category: depositForm.category,
      spender: depositForm.spender,
      type: 'Ingreso',
      frequency: depositForm.category === 'Fijo' ? 'Fijo' : 'Aleatorio',
      account: depositWallet,
      date: Timestamp.now()
    };

    setDepositWallet(null);
    setDepositForm({ amount: '', spender: depositForm.spender, category: depositForm.category });
    await addDoc(collection(db, "transactions"), dataToSave);
  };

  const copyDebugInfo = () => {
    navigator.clipboard.writeText(JSON.stringify({t: new Date().toISOString(), l: saldoLibre, c: capitalEnBanco, rates: rates}));
    alert("🛠️ Modo Debug Copiado");
  };

  const HomeTab = () => (
    <div className="animate-in fade-in duration-300">
      
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

      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Cuentas (Equivalentes Locales)</h2>
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 hide-scrollbar">
          {['Binance', 'BCP', 'BDV'].map(acc => {
            const colors = { Binance: 'text-[#F3BA2F] bg-[#F3BA2F]/10 border-[#F3BA2F]/30', BCP: 'text-[#FF7A00] bg-[#FF7A00]/10 border-[#FF7A00]/30', BDV: 'text-paty-pink bg-paty-pink/10 border-paty-pink/30' };
            const textColor = { Binance: 'text-[#F3BA2F]', BCP: 'text-[#FF7A00]', BDV: 'text-paty-pink' };
            const localBalance = balances[acc] * exchangeRates[acc].rate;
            
            return (
              <button key={acc} onClick={() => setDepositWallet(acc)} className={`min-w-[140px] ${colors[acc]} border p-4 rounded-3xl flex-shrink-0 active:scale-95 transition-all text-left relative overflow-hidden`}>
                <div className="flex justify-between items-center mb-1">
                   <p className={`text-[10px] font-black ${textColor[acc]} uppercase flex items-center gap-1`}><Wallet size={12}/> {acc}</p>
                   {isLive && <span className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse"></span>}
                </div>
                <p className="font-black text-xl text-slate-800">\$${balances[acc].toLocaleString()}</p>
                <p className={`text-[9px] font-bold mt-1 ${textColor[acc]}`}>
                  ≈ {exchangeRates[acc].currency} {localBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </button>
            )
          })}
      </div>

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
        <p className="text-sm text-slate-500 px-2">Gráficos avanzados próximamente.</p>
     </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 select-none text-slate-900 relative">
      
      {/* --- WALL STREET TICKER --- */}
      <div className="bg-slate-900 text-success-green font-mono text-[10px] font-bold py-1.5 overflow-hidden whitespace-nowrap sticky top-0 z-50 shadow-md">
         <div className="inline-block animate-ticker">
            <span className="mx-6 flex-inline items-center"><Activity size={10} className="inline mr-1 text-white"/>🇻🇪 BCV Oficial: <span className="text-white">Bs. {rates.bcv.toFixed(2)}</span></span>
            <span className="mx-6 flex-inline items-center"><TrendingUp size={10} className="inline mr-1 text-white"/>🚀 P2P/Paralelo: <span className="text-white">Bs. {rates.paralelo.toFixed(2)}</span></span>
            <span className="mx-6 flex-inline items-center"><Activity size={10} className="inline mr-1 text-white"/>🇵🇪 Soles (PEN): <span className="text-white">S/ {rates.pen.toFixed(2)}</span></span>
            <span className="mx-6 flex-inline items-center"><Activity size={10} className="inline mr-1 text-white"/>🇻🇪 BCV Oficial: <span className="text-white">Bs. {rates.bcv.toFixed(2)}</span></span>
            <span className="mx-6 flex-inline items-center"><TrendingUp size={10} className="inline mr-1 text-white"/>🚀 P2P/Paralelo: <span className="text-white">Bs. {rates.paralelo.toFixed(2)}</span></span>
         </div>
      </div>

      {showEasterEgg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className="text-center">
                <p className="text-8xl animate-bounce">🥧</p>
                <h1 className="text-white font-black text-4xl mt-4">¡DÍA DE PI!</h1>
                <p className="text-slate-300 font-bold mt-2">Encontraste el Easter Egg, Santi.</p>
            </div>
        </div>
      )}

      {depositWallet && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in" onClick={() => setDepositWallet(null)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto shadow-2xl animate-in slide-in-from-bottom-10">
            
            <button onClick={() => setDepositWallet(null)} className="absolute top-6 right-6 bg-[#F2F2F7] p-2 rounded-full text-slate-400 active:scale-90"><X size={20}/></button>

            <div className="flex items-center gap-3 mb-6">
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${depositWallet === 'Binance' ? 'bg-[#F3BA2F]/10 text-[#F3BA2F]' : depositWallet === 'BCP' ? 'bg-[#FF7A00]/10 text-[#FF7A00]' : 'bg-paty-pink/10 text-paty-pink'}`}>
                  <Wallet size={24} />
               </div>
               <div>
                 <h2 className="text-2xl font-black">Cuenta {depositWallet}</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ingreso Directo</p>
               </div>
            </div>

            <div className="bg-[#F2F2F7] p-5 rounded-3xl mb-6">
                <div className="flex justify-between items-center mb-2">
                   <p className="text-xs font-bold text-slate-500">Saldo Actual Base (USD)</p>
                   <p className="text-[10px] font-black text-success-green flex items-center gap-1"><TrendingUp size={12}/> {exchangeRates[depositWallet].label}</p>
                </div>
                <div className="flex justify-between items-end">
                   <p className="text-4xl font-black tracking-tighter">\$${balances[depositWallet].toLocaleString()}</p>
                   <div className="text-right">
                      <p className="text-sm font-black text-slate-700">{(balances[depositWallet] * exchangeRates[depositWallet].rate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {exchangeRates[depositWallet].currency}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Tasa en vivo: {exchangeRates[depositWallet].rate}</p>
                   </div>
                </div>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-5">
              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl">
                <button type="button" onClick={() => setDepositForm({...depositForm, spender: 'Santi'})} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${depositForm.spender === 'Santi' ? 'bg-santi-blue text-white shadow-md' : 'text-slate-400'}`}>SANTI</button>
                <button type="button" onClick={() => setDepositForm({...depositForm, spender: 'Paty'})} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${depositForm.spender === 'Paty' ? 'bg-paty-pink text-white shadow-md' : 'text-slate-400'}`}>PATY</button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
                {['Fijo', 'Freelance', 'Extra'].map(cat => (
                  <button key={cat} type="button" onClick={() => setDepositForm({...depositForm, category: cat})} className={`p-3 rounded-xl border-2 transition-all ${depositForm.category === cat ? 'border-success-green bg-success-green text-white' : 'border-slate-100 bg-white'}`}>{cat}</button>
                ))}
              </div>

              <div className="relative">
                 <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">\$</span>
                 <input type="number" step="0.01" placeholder="Monto en USD" className="w-full bg-[#F2F2F7] p-5 pl-14 rounded-3xl outline-none font-black text-3xl text-success-green placeholder:text-success-green/30" value={depositForm.amount} onChange={e => setDepositForm({...depositForm, amount: e.target.value})} autoFocus />
              </div>

              <button type="submit" className="w-full bg-success-green text-white p-6 rounded-[2.5rem] font-black text-xl active:scale-95 transition-all shadow-xl shadow-success-green/20">Depositar Fondos</button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto sticky top-8 z-30 px-6 pt-8 pb-4 backdrop-blur-xl bg-[#F2F2F7]/90">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">\$${capitalEnBanco.toLocaleString()}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capital Total Real (USD)</p>
          </div>
          <button onClick={copyDebugInfo} className="opacity-10 text-xl">🛠️</button>
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 pt-2">
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
            <h2 className="text-xl font-black mb-4 text-center">Registrar Salida</h2>
            <form onSubmit={handleGeneralSubmit} className="space-y-4">
              
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2">¿De qué cuenta salió?</p>
                 <div className="flex gap-2">
                    {['Binance', 'BCP', 'BDV'].map(acc => (
                        <button key={acc} type="button" onClick={() => setFormData({...formData, account: acc})} className={`flex-1 py-3 rounded-2xl font-black text-xs border-2 transition-all ${formData.account === acc ? (acc === 'Binance' ? 'border-[#F3BA2F] text-[#F3BA2F] bg-[#F3BA2F]/10' : acc === 'BCP' ? 'border-[#FF7A00] text-[#FF7A00] bg-[#FF7A00]/10' : 'border-paty-pink text-paty-pink bg-paty-pink/10') : 'border-transparent bg-[#F2F2F7] text-slate-400'}`}>
                            {acc}
                        </button>
                    ))}
                 </div>
              </div>

              <input type="text" placeholder="¿En qué gastaste?" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300">\$</span>
                 <input type="number" step="0.01" placeholder="Monto Total" className="w-full bg-[#F2F2F7] p-4 pl-10 rounded-2xl outline-none font-black text-4xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
                {['Comida', 'Cashea', 'Auto', 'Gym', 'Alquiler', 'Torta'].map(cat => (
                   <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' ? 'Fijo' : 'Aleatorio'})} className={`p-3 rounded-xl border-2 transition-all ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white'}`}>{cat}</button>
                ))}
              </div>

              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl mt-4">
                <button type="button" onClick={() => setFormData({...formData, spender: 'Santi'})} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${formData.spender === 'Santi' ? 'bg-santi-blue text-white shadow-md' : 'text-slate-400'}`}>SANTI</button>
                <button type="button" onClick={() => setFormData({...formData, spender: 'Paty'})} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${formData.spender === 'Paty' ? 'bg-paty-pink text-white shadow-md' : 'text-slate-400'}`}>PATY</button>
              </div>

              {formData.category === 'Cashea' && (
                <div className="p-4 bg-santi-blue/5 rounded-2xl border border-santi-blue/20 mt-4">
                  <input type="number" step="0.01" placeholder="¿Cuánto pagaste de inicial? $" className="w-full bg-white p-3 rounded-xl outline-none font-bold text-santi-blue text-sm border border-slate-100" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />
                </div>
              )}

              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg active:scale-95 transition-all shadow-xl mt-4">Registrar Gasto</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
