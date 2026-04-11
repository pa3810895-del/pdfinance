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
    setSyncStatus('📡 Sincronizando...');
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares');
      const data = await res.json();
      const oficial = data.find(d => d.casa === 'oficial')?.precio || 475.20;
      const paralelo = data.find(d => d.casa === 'paralelo')?.precio || 633.50;
      setRates(prev => ({ ...prev, bcv: oficial, paralelo: paralelo }));
      setSyncStatus('🟢 Online');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e) { setSyncStatus('🟠 Offline'); }
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

  // --- LÓGICA DE CUENTAS (INTEGRIDAD TOTAL) ---
  const getBalance = (acc) => {
    // Ingresos a esta cuenta específica
    const inc = transactions.filter(t => t.type === 'Ingreso' && t.account === acc).reduce((a,c) => a + Number(c.amount), 0);
    // Gastos que YA salieron de esta cuenta (Pagados)
    const exp = transactions.filter(t => t.type === 'Egreso' && t.account === acc && t.status === 'Pagado').reduce((a,c) => a + Number(c.amount), 0);
    // Movimientos entre cuentas
    const tIn = transactions.filter(t => t.type === 'Transferencia' && t.toAcc === acc).reduce((a,c) => a + Number(c.amount), 0);
    const tOut = transactions.filter(t => t.type === 'Transferencia' && t.fromAcc === acc).reduce((a,c) => a + Number(c.amount), 0);
    return inc - exp + tIn - tOut;
  };

  const balances = { Binance: getBalance('Binance'), BCP: getBalance('BCP'), BDV: getBalance('BDV') };
  const capitalGlobal = Object.values(balances).reduce((a,b) => a + b, 0);

  // Arqueo Mensual
  const currentMonthData = transactions.filter(t => t.date?.toDate().toISOString().startsWith(timeFilter));
  
  // Lo que está en el banco pero "no es nuestro" (Deudas y Fijos sin pagar)
  const deudasPendientes = transactions.filter(t => t.status === 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const saldoLibre = capitalGlobal - deudasPendientes;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return;

    if (formData.type === 'Transferencia') {
      await addDoc(collection(db, "transactions"), { ...formData, amount: Number(formData.amount), date: Timestamp.now(), spender: 'Sistema' });
    } else if (formData.category === 'Cashea') {
      const total = Number(formData.amount);
      const inicial = Number(formData.initialPayment || 0);
      const numCuotas = Number(formData.installments);
      const cuotaMonto = (total - inicial) / numCuotas;
      
      // La inicial sale HOY de la cuenta elegida
      await addDoc(collection(db, "transactions"), { ...formData, title: `(Inicial) ${formData.title}`, amount: inicial, status: 'Pagado', date: Timestamp.now() });
      
      // Las cuotas quedan amarradas a la MISMA cuenta para el futuro
      for (let i = 1; i <= numCuotas; i++) {
        const d = new Date(); d.setDate(d.getDate() + (i * 14));
        await addDoc(collection(db, "transactions"), { ...formData, title: `(Cuota ${i}/${numCuotas}) ${formData.title}`, amount: cuotaMonto, status: 'Pendiente', date: Timestamp.fromDate(d) });
      }
    } else {
      // Gastos normales o fijos
      await addDoc(collection(db, "transactions"), { ...formData, amount: Number(formData.amount), date: Timestamp.now(), status: formData.frequency === 'Fijo' ? 'Pendiente' : 'Pagado' });
    }
    setShowModal(false);
    setFormData({ ...formData, title: '', amount: '', initialPayment: '' });
  };

  const toggleStatus = async (item) => {
    // Al pagar una deuda, se resta de la cuenta a la que fue asignada originalmente
    await updateDoc(doc(db, "transactions", item.id), { status: item.status === 'Pagado' ? 'Pendiente' : 'Pagado', date: Timestamp.now() });
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 text-slate-900 relative">
      <style>{`
        @keyframes ticker { 0% { transform: translateX(100vw); } 100% { transform: translateX(-200%); } }
        .ticker-wrap { display: inline-flex; white-space: nowrap; animation: ticker 25s linear infinite; }
      `}</style>

      {/* TICKER */}
      <div className="bg-slate-900 text-success-green font-mono text-[10px] font-bold py-2 overflow-hidden sticky top-0 z-50">
         <div className="ticker-wrap items-center">
            <span className="mx-8 flex items-center gap-1.5"><Activity size={12}/> BCV: Bs. {rates.bcv.toFixed(2)}</span>
            <span className="mx-8 flex items-center gap-1.5"><TrendingUp size={12}/> PARALELO: Bs. {rates.paralelo.toFixed(2)}</span>
         </div>
      </div>

      <header className="max-w-md mx-auto px-7 pt-8 pb-4">
         <div className="flex justify-between items-center">
            <div>
               <h1 className="text-4xl font-black tracking-tighter">\$${capitalGlobal.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
               <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Capital en Cuentas</p>
            </div>
            <button onClick={fetchRates} className="p-3 bg-white rounded-full shadow-sm active:rotate-180 transition-all border border-slate-100"><RefreshCw size={18} className="text-slate-400"/></button>
         </div>
      </header>

      <main className="max-w-md mx-auto px-7">
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-700">
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl mb-6 relative overflow-hidden">
               <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Saldo Libre Real</p>
               <h2 className={`text-5xl font-black tracking-tighter ${saldoLibre >= 0 ? 'text-success-green' : 'text-paty-pink'}`}>\$${saldoLibre.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
               <p className="text-[9px] text-slate-400 mt-4 font-bold">Considerando {transactions.filter(t => t.status === 'Pendiente').length} pagos pendientes</p>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
              {['Binance', 'BCP', 'BDV'].map(acc => (
                <div key={acc} className="min-w-[140px] bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{acc}</p>
                  <p className="text-xl font-black">\$${balances[acc].toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 pb-10 animate-in fade-in">
            {currentMonthData.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-3xl border border-slate-50 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.type === 'Ingreso' ? 'bg-success-green/10 text-success-green' : 'bg-slate-50'}`}>
                    {t.type === 'Ingreso' ? <ArrowUpCircle size={18}/> : <CreditCard size={18}/>}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">{t.title}</h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase">{t.account || t.fromAcc} • {t.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-success-green' : 'text-slate-900'}`}>\$${Math.abs(t.amount).toFixed(2)}</p>
                  <button onClick={() => {if(window.confirm("¿Borrar?")) deleteDoc(doc(db, "transactions", t.id))}} className="text-slate-200 hover:text-paty-pink"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'analytics' && (
           <div className="space-y-6 animate-in fade-in pb-10">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase mb-4">Próximos Cobros</h3>
                <div className="space-y-3">
                  {transactions.filter(t => t.status === 'Pendiente').map(t => (
                    <button key={t.id} onClick={() => toggleStatus(t)} className="w-full flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl transition-all">
                       <div className="text-left">
                          <p className="text-xs font-bold">{t.title}</p>
                          <p className="text-[8px] text-orange-400 font-black uppercase">Debita de: {t.account}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <p className="text-sm font-black">\$${t.amount.toFixed(2)}</p>
                          <ChevronRight size={14} className="text-slate-300"/>
                       </div>
                    </button>
                  ))}
                </div>
              </div>
           </div>
        )}
      </main>

      {/* NAV */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] bg-slate-900 rounded-full p-2 flex justify-between items-center z-40 shadow-2xl">
        <button onClick={() => setActiveTab('home')} className={`flex-1 flex justify-center p-3 rounded-full ${activeTab === 'home' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><Home size={20}/></button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 flex justify-center p-3 rounded-full ${activeTab === 'history' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><List size={20}/></button>
        <div className="w-12"></div>
        <button onClick={() => setActiveTab('analytics')} className={`flex-1 flex justify-center p-3 rounded-full ${activeTab === 'analytics' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><BarChart3 size={20}/></button>
      </nav>

      <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-success-green text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-[#F2F2F7] active:scale-90 transition-all">
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-10 max-w-md mx-auto shadow-2xl">
            <h2 className="text-xl font-black mb-6 text-center">Registrar Movimiento</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex bg-[#F2F2F7] p-1 rounded-2xl">
                 {['Egreso', 'Ingreso', 'Transferencia'].map(t => (
                   <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${formData.type === t ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{t.toUpperCase()}</button>
                 ))}
              </div>

              {/* SELECTOR DE CUENTA OBLIGATORIO */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase ml-2">¿De qué cuenta sale el dinero?</p>
                <div className="flex gap-2">
                  {['Binance', 'BCP', 'BDV'].map(acc => (
                    <button key={acc} type="button" onClick={() => setFormData({...formData, account: acc})} className={`flex-1 py-3 rounded-xl text-[10px] font-black border-2 transition-all ${formData.account === acc ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-400'}`}>{acc}</button>
                  ))}
                </div>
              </div>

              <input type="text" placeholder="¿Concepto?" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">\$</span>
                 <input type="number" step="0.01" placeholder="0.00" className="w-full bg-[#F2F2F7] p-5 pl-10 rounded-3xl outline-none font-black text-4xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>

              {formData.type === 'Egreso' && (
                <div className="grid grid-cols-3 gap-2">
                   {['Comida', 'Cashea', 'Auto', 'Alquiler'].map(cat => (
                     <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' ? 'Fijo' : 'Aleatorio'})} className={`py-3 rounded-xl text-[9px] font-black border-2 transition-all ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-400'}`}>{cat.toUpperCase()}</button>
                   ))}
                </div>
              )}

              {formData.category === 'Cashea' && formData.type === 'Egreso' && (
                <div className="p-4 bg-santi-blue/5 rounded-2xl border border-santi-blue/20">
                   <input type="number" placeholder="Inicial pagada hoy $" className="w-full bg-white p-3 rounded-xl border border-slate-100 font-bold text-xs" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />
                   <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase">Esto se restará de {formData.account} hoy.</p>
                </div>
              )}

              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg active:scale-95 transition-all shadow-xl">Confirmar Movimiento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
