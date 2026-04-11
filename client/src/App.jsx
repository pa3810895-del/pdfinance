import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Home, List, BarChart3, Plus, ArrowUpCircle, Snowflake, Wallet, TrendingUp, Activity, X, CalendarCheck, RefreshCw, Trash2, ArrowRightLeft, CreditCard, ChevronRight } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [timeFilter, setTimeFilter] = useState('');
  const [rates, setRates] = useState({ bcv: 475.20, paralelo: 633.50, pen: 3.75 });
  const [syncStatus, setSyncStatus] = useState('');
  
  const [formData, setFormData] = useState({ 
    title: '', amount: '', initialPayment: '', category: 'Comida', spender: 'Santi', 
    type: 'Egreso', frequency: 'Aleatorio', account: 'Binance', fromAcc: 'Binance', 
    toAcc: 'BDV', installments: '3' 
  });

  const fetchRates = async () => {
    setSyncStatus('📡 Sincronizando tasas...');
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares');
      const data = await res.json();
      const oficial = data.find(d => d.casa === 'oficial')?.precio || 475.20;
      const paralelo = data.find(d => d.casa === 'paralelo')?.precio || 633.50;
      setRates(prev => ({ ...prev, bcv: oficial, paralelo: paralelo }));
      setSyncStatus('🟢 Datos actualizados');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e) { setSyncStatus('🟠 Servidor Offline'); }
  };

  useEffect(() => {
    fetchRates();
    const now = new Date();
    setTimeFilter(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- FILTROS Y LÓGICA DE TIEMPO ---
  const currentMonthData = transactions.filter(t => t.date?.toDate().toISOString().startsWith(timeFilter));
  
  // --- MATEMÁTICAS DE PRODUCCIÓN ---
  const getBalance = (acc) => {
    const inc = transactions.filter(t => t.type === 'Ingreso' && t.account === acc).reduce((a,c) => a + Number(c.amount), 0);
    const exp = transactions.filter(t => t.type === 'Egreso' && t.account === acc && t.status !== 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
    const tIn = transactions.filter(t => t.type === 'Transferencia' && t.toAcc === acc).reduce((a,c) => a + Number(c.amount), 0);
    const tOut = transactions.filter(t => t.type === 'Transferencia' && t.fromAcc === acc).reduce((a,c) => a + Number(c.amount), 0);
    return inc - exp + tIn - tOut;
  };

  const balances = { Binance: getBalance('Binance'), BCP: getBalance('BCP'), BDV: getBalance('BDV') };
  const capitalGlobal = Object.values(balances).reduce((a,b) => a + b, 0);

  const deudasCashea = transactions.filter(t => t.category === 'Cashea' && t.status === 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const fijosPendientes = currentMonthData.filter(t => t.frequency === 'Fijo' && t.status === 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const saldoLibre = capitalGlobal - deudasCashea - fijosPendientes;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return;

    if (formData.type === 'Transferencia') {
      await addDoc(collection(db, "transactions"), { ...formData, date: Timestamp.now(), spender: 'Sistema', amount: Number(formData.amount) });
    } else if (formData.category === 'Cashea') {
      const total = Number(formData.amount);
      const inicial = Number(formData.initialPayment || 0);
      const numCuotas = Number(formData.installments);
      const cuotaMonto = (total - inicial) / numCuotas;
      
      await addDoc(collection(db, "transactions"), { ...formData, title: `(Inicial) ${formData.title}`, amount: inicial, status: 'Pagado', date: Timestamp.now() });
      for (let i = 1; i <= numCuotas; i++) {
        const d = new Date(); d.setDate(d.getDate() + (i * 14));
        await addDoc(collection(db, "transactions"), { ...formData, title: `(Cuota ${i}/${numCuotas}) ${formData.title}`, amount: cuotaMonto, status: 'Pendiente', date: Timestamp.fromDate(d) });
      }
    } else {
      await addDoc(collection(db, "transactions"), { ...formData, amount: Number(formData.amount), date: Timestamp.now(), status: formData.frequency === 'Fijo' ? 'Pendiente' : 'Pagado' });
    }
    setShowModal(false);
    setFormData({ ...formData, title: '', amount: '', initialPayment: '' });
  };

  const toggleStatus = async (item) => {
    await updateDoc(doc(db, "transactions", item.id), { status: item.status === 'Pagado' ? 'Pendiente' : 'Pagado', date: Timestamp.now() });
  };

  // --- COMPONENTES ---
  const HomeView = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-success-green/10 blur-[80px] rounded-full" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Presupuesto Disponible</p>
        <h2 className={`text-6xl font-black tracking-tighter ${saldoLibre >= 0 ? 'text-success-green' : 'text-paty-pink'}`}>
          \$${saldoLibre.toLocaleString(undefined, {minimumFractionDigits: 2})}
        </h2>
        <div className="flex gap-2 mt-4">
          <span className="text-[9px] bg-white/10 px-3 py-1 rounded-full font-bold text-slate-400">Arqueo {timeFilter}</span>
          {saldoLibre > 100 && <span className="text-[9px] bg-success-green/20 text-success-green px-3 py-1 rounded-full font-bold">Safe Zone 🟢</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
          {['Binance', 'BCP', 'BDV'].map(acc => (
            <div key={acc} className="min-w-[160px] bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase">{acc}</p>
                <Wallet size={12} className="text-slate-300"/>
              </div>
              <p className="text-2xl font-black text-slate-800">\$${balances[acc].toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group active:scale-95 transition-all">
          <Snowflake size={40} className="absolute -right-2 -top-2 text-santi-blue opacity-5 group-hover:opacity-20 transition-opacity" />
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Bloqueado Cashea</p>
          <p className="text-2xl font-black text-santi-blue">\$${deudasCashea.toFixed(0)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group active:scale-95 transition-all">
          <CalendarCheck size={40} className="absolute -right-2 -top-2 text-slate-400 opacity-5" />
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Fijos del Mes</p>
          <p className="text-2xl font-black text-slate-800">\$${fijosPendientes.toFixed(0)}</p>
        </div>
      </div>
    </div>
  );

  const HistoryView = () => (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {['Todos', 'Ingreso', 'Egreso', 'Transferencia'].map(f => (
          <button key={f} onClick={() => setHistoryFilter(f)} className={`px-5 py-2 rounded-full text-[10px] font-black transition-all ${historyFilter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>{f.toUpperCase()}</button>
        ))}
      </div>
      <div className="space-y-4">
        {currentMonthData.filter(t => historyFilter === 'Todos' || t.type === historyFilter).map(t => (
          <div key={t.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-50 flex justify-between items-center relative group">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${t.type === 'Ingreso' ? 'bg-success-green/10 text-success-green' : 'bg-slate-50'}`}>
                {t.type === 'Ingreso' ? <ArrowUpCircle /> : t.type === 'Transferencia' ? <ArrowRightLeft /> : <CreditCard />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{t.title}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{t.account || t.fromAcc} • {t.status || 'Completado'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className={`font-black ${t.type === 'Ingreso' ? 'text-success-green' : 'text-slate-900'}`}>{t.type === 'Ingreso' ? '+' : '-'}\$${Math.abs(t.amount).toFixed(2)}</p>
              <button onClick={() => {if(window.confirm("¿Borrar?")) deleteDoc(doc(db, "transactions", t.id))}} className="text-slate-200 hover:text-paty-pink transition-colors"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AnalyticsView = () => {
    const santiPagos = currentMonthData.filter(t => t.spender === 'Santi' && t.type === 'Egreso' && t.status !== 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
    const patyPagos = currentMonthData.filter(t => t.spender === 'Paty' && t.type === 'Egreso' && t.status !== 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
    const diff = (santiPagos - patyPagos) / 2;

    return (
      <div className="animate-in fade-in duration-500 pb-20">
        <div className="bg-slate-900 text-white p-8 rounded-[3rem] mb-8 shadow-xl">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Auditoría Cuentas Claras</p>
           {diff === 0 ? <p className="text-2xl font-black text-success-green">¡Todo cuadrado! 🤝</p> : (
             <p className="text-2xl font-black">
               {diff > 0 ? 'Paty' : 'Santi'} debe poner <span className="text-success-green">\$${Math.abs(diff).toFixed(2)}</span> para equilibrar.
             </p>
           )}
           <div className="flex gap-4 mt-6">
              <div className="flex-1 bg-white/5 p-4 rounded-3xl">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Santi pagó</p>
                <p className="font-bold">\$${santiPagos.toFixed(0)}</p>
              </div>
              <div className="flex-1 bg-white/5 p-4 rounded-3xl">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Paty pagó</p>
                <p className="font-bold">\$${patyPagos.toFixed(0)}</p>
              </div>
           </div>
        </div>

        <h2 className="text-xs font-black text-slate-400 uppercase px-2 mb-4">Deudas Pendientes por Pagar</h2>
        <div className="space-y-3">
           {transactions.filter(t => t.status === 'Pendiente').slice(0, 5).map(t => (
             <button key={t.id} onClick={() => toggleStatus(t)} className="w-full bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center active:scale-95 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                  <div className="text-left">
                    <p className="font-bold text-sm text-slate-800">{t.title}</p>
                    <p className="text-[8px] text-slate-400 uppercase font-black">Vencimiento estimado</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-slate-900">\$${t.amount.toFixed(2)}</p>
                  <ChevronRight size={14} className="text-slate-300"/>
                </div>
             </button>
           ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 text-slate-900 relative selection:bg-santi-blue selection:text-white">
      <style>{`
        @keyframes ticker { 0% { transform: translateX(100vw); } 100% { transform: translateX(-200%); } }
        .ticker-wrap { display: inline-flex; white-space: nowrap; animation: ticker 25s linear infinite; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* TICKER PREMIUM */}
      <div className="bg-slate-900 text-success-green font-mono text-[10px] font-bold py-2.5 overflow-hidden sticky top-0 z-50 border-b border-white/5 shadow-lg">
         <div className="ticker-wrap items-center">
            <span className="mx-8 flex items-center gap-1.5"><Activity size={12} className="text-white"/> 🇻🇪 BCV: Bs. {rates.bcv.toFixed(2)}</span>
            <span className="mx-8 flex items-center gap-1.5"><TrendingUp size={12} className="text-white"/> 🚀 PARALELO: Bs. {rates.paralelo.toFixed(2)}</span>
            <span className="mx-8 flex items-center gap-1.5"><Activity size={12} className="text-white"/> 🇵🇪 SOLES: S/ {rates.pen.toFixed(2)}</span>
         </div>
      </div>

      <header className="max-w-md mx-auto px-7 pt-10 pb-4">
         <div className="flex justify-between items-center mb-6">
            <div>
               <h1 className="text-5xl font-black tracking-tighter text-slate-900">\$${capitalGlobal.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
               <div className="flex items-center gap-2 mt-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capital Total Real</p>
                 {syncStatus && <span className="text-[8px] font-bold text-santi-blue animate-pulse">{syncStatus}</span>}
               </div>
            </div>
            <button onClick={fetchRates} className="p-3 bg-white rounded-full shadow-sm active:rotate-180 transition-all duration-700 border border-slate-100"><RefreshCw size={18} className="text-slate-400"/></button>
         </div>
         
         <div className="flex gap-4 bg-white/50 backdrop-blur-md p-4 rounded-[2rem] border border-white shadow-sm">
            <div className="flex-1">
               <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total en Bolívares</p>
               <p className="text-sm font-black text-slate-700">Bs. {(capitalGlobal * rates.paralelo).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div className="flex-1 text-right">
               <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Status Global</p>
               <p className="text-sm font-black text-success-green">SALUDABLE ✨</p>
            </div>
         </div>
      </header>

      <main className="max-w-md mx-auto px-7 pt-4">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'analytics' && <AnalyticsView />}
      </main>

      {/* FOOTER NAV PREMIUM */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-slate-900/90 backdrop-blur-2xl rounded-full p-2 flex justify-between items-center z-40 shadow-2xl border border-white/10">
        <button onClick={() => setActiveTab('home')} className={`flex-1 flex justify-center p-4 rounded-full transition-all ${activeTab === 'home' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><Home size={22} strokeWidth={2.5}/></button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 flex justify-center p-4 rounded-full transition-all ${activeTab === 'history' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><List size={22} strokeWidth={2.5}/></button>
        <div className="w-16"></div>
        <button onClick={() => setActiveTab('analytics')} className={`flex-1 flex justify-center p-4 rounded-full transition-all ${activeTab === 'analytics' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><BarChart3 size={22} strokeWidth={2.5}/></button>
      </nav>

      <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-success-green text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-[#F2F2F7] active:scale-90 transition-all">
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* MODAL MAESTRO GOLD */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3.5rem] p-10 max-w-md mx-auto shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
            
            <div className="flex bg-[#F2F2F7] p-1.5 rounded-[2rem] mb-8">
               {['Egreso', 'Ingreso', 'Transferencia'].map(t => (
                 <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black tracking-widest transition-all ${formData.type === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>{t.toUpperCase()}</button>
               ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {formData.type === 'Transferencia' ? (
                <div className="flex gap-4 items-center bg-[#F2F2F7] p-6 rounded-[2rem]">
                   <select className="flex-1 bg-transparent font-black text-sm outline-none" value={formData.fromAcc} onChange={e => setFormData({...formData, fromAcc: e.target.value})}><option>Binance</option><option>BCP</option><option>BDV</option></select>
                   <ArrowRightLeft size={18} className="text-slate-300"/>
                   <select className="flex-1 bg-transparent font-black text-sm outline-none" value={formData.toAcc} onChange={e => setFormData({...formData, toAcc: e.target.value})}><option>Binance</option><option>BCP</option><option>BDV</option></select>
                </div>
              ) : (
                <div className="flex gap-2">
                  {['Binance', 'BCP', 'BDV'].map(acc => (
                    <button key={acc} type="button" onClick={() => setFormData({...formData, account: acc})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black border-2 transition-all ${formData.account === acc ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-400'}`}>{acc}</button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <input type="text" placeholder="¿Qué compraste?" className="w-full bg-[#F2F2F7] p-5 rounded-[1.5rem] outline-none font-bold text-slate-800 placeholder:text-slate-300" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                <div className="relative">
                   <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-200">\$</span>
                   <input type="number" step="0.01" placeholder="0.00" className="w-full bg-[#F2F2F7] p-8 pl-14 rounded-[2.5rem] outline-none font-black text-5xl text-slate-900 placeholder:text-slate-200" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>

              {formData.type !== 'Transferencia' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {['Comida', 'Cashea', 'Auto', 'Gym', 'Alquiler', 'Torta'].map(cat => (
                      <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' ? 'Fijo' : 'Aleatorio'})} className={`py-4 rounded-2xl text-[9px] font-black border-2 transition-all ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-400'}`}>{cat.toUpperCase()}</button>
                    ))}
                  </div>
                  <div className="flex bg-[#F2F2F7] p-1.5 rounded-[1.5rem]">
                    {['Santi', 'Paty'].map(s => (
                      <button key={s} type="button" onClick={() => setFormData({...formData, spender: s})} className={`flex-1 py-4 rounded-xl text-[10px] font-black transition-all ${formData.spender === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>{s.toUpperCase()}</button>
                    ))}
                  </div>
                </>
              )}

              {formData.category === 'Cashea' && (
                <div className="p-6 bg-santi-blue/5 rounded-[2rem] border border-santi-blue/20 space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-santi-blue uppercase mb-2">Cuotas del Plan</p>
                    <div className="flex gap-2">
                      {['3', '6', '9', '12'].map(num => (
                        <button key={num} type="button" onClick={() => setFormData({...formData, installments: num})} className={`flex-1 py-2 rounded-xl text-xs font-black ${formData.installments === num ? 'bg-santi-blue text-white' : 'bg-white text-santi-blue border border-santi-blue/20'}`}>{num}</button>
                      ))}
                    </div>
                  </div>
                  <input type="number" placeholder="Inicial pagada hoy $" className="w-full bg-white p-4 rounded-xl border border-slate-100 font-bold text-sm" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />
                </div>
              )}

              <button type="submit" className="w-full bg-slate-900 text-white p-7 rounded-[2.5rem] font-black text-xl shadow-xl active:scale-95 transition-all">Registrar Movimiento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
