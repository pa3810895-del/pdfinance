import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { Home, List, BarChart3, Plus, ArrowUpCircle, Snowflake, Wallet, TrendingUp, Activity, X, CalendarCheck, CheckCircle2, Circle } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [depositWallet, setDepositWallet] = useState(null);
  
  // NUEVO: Modales Gestores
  const [managerModal, setManagerModal] = useState(null); // 'cashea' | 'fijos' | null
  
  // NUEVO: Filtro de Tiempo
  const [timeFilter, setTimeFilter] = useState('Global'); // 'Global' | '2026-04' (Ejemplo)

  const [depositForm, setDepositForm] = useState({ amount: '', spender: 'Santi', category: 'Freelance' });
  const [activeTab, setActiveTab] = useState('home');
  const [historyFilter, setHistoryFilter] = useState('Todos');
  const [rates, setRates] = useState({ bcv: 475.20, paralelo: 633.50, pen: 3.75 });
  const [syncStatus, setSyncStatus] = useState('Conectando...');

  const [formData, setFormData] = useState({ 
    title: '', amount: '', initialPayment: '', category: 'Comida', spender: 'Santi', type: 'Egreso', frequency: 'Aleatorio', installments: '3', account: 'Binance'
  });

  const fetchRates = async () => {
    setSyncStatus('Sincronizando...');
    let bcvVal = 475.20; let parVal = 633.50; let penVal = 3.75; let confirmed = false;
    try {
      const res1 = await fetch('https://ve.dolarapi.com/v1/dolares');
      if(res1.ok) {
        const data1 = await res1.json();
        const oficial = data1.find(d => d.casa === 'oficial' || d.casa === 'bcv');
        const paralelo = data1.find(d => d.casa === 'paralelo' || d.casa === 'enparalelovzla');
        if(oficial) bcvVal = oficial.precio;
        if(paralelo) parVal = paralelo.precio;
        confirmed = true;
      }
    } catch (e) {}

    if (!confirmed) {
      try {
        const res2 = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar');
        if(res2.ok) {
          const data2 = await res2.json();
          bcvVal = data2.monitors.bcv.price; parVal = data2.monitors.enparalelovzla.price;
          confirmed = true;
        }
      } catch (e) {}
    }

    try {
      const peRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if(peRes.ok) { const peData = await peRes.json(); penVal = peData.rates.PEN; }
    } catch(e) {}

    setRates({ bcv: bcvVal || 475.20, paralelo: parVal || 633.50, pen: penVal || 3.75 });
    if(confirmed) {
       setSyncStatus('🟢 Tasas al día'); setTimeout(() => setSyncStatus(''), 4000);
    } else { setSyncStatus('🟠 Modo offline'); }
  };

  useEffect(() => {
    fetchRates();
    window.addEventListener('focus', fetchRates);
    
    // Setear el mes actual por defecto al cargar (ej. "2026-04")
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setTimeFilter(currentMonthStr);

    return () => window.removeEventListener('focus', fetchRates);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  // --- OBTENER MESES DISPONIBLES PARA EL FILTRO ---
  const availableMonths = ['Global', ...new Set(transactions.map(t => {
      if(!t.date) return null;
      const d = t.date.toDate();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }).filter(Boolean))];

  // --- FILTRADO DE DATA SEGÚN EL TIEMPO ---
  // El balance bancario siempre es Global, pero los gastos/ingresos operativos pueden filtrarse
  const dataToAnalyze = timeFilter === 'Global' 
      ? transactions 
      : transactions.filter(t => t.date && t.date.toDate().toISOString().startsWith(timeFilter));

  // --- MATEMÁTICAS GLOBALES (Billeteras Intocables por el filtro de mes) ---
  const globalIncomes = transactions.filter(t => t.type === 'Ingreso').reduce((a,c) => a + Number(c.amount), 0);
  const globalExpenses = transactions.filter(t => t.type === 'Egreso').reduce((a,c) => a + Number(c.category === 'Cashea' ? (c.initialPayment || c.amount) : c.amount), 0);
  const capitalEnBanco = globalIncomes - globalExpenses;

  // --- MATEMÁTICAS FILTRADAS (Arqueo) ---
  // El dinero congelado solo cuenta las deudas pendientes (status !== 'Pagado')
  const dineroCongelado = transactions.filter(t => t.type === 'Egreso' && t.category === 'Cashea' && t.status !== 'Pagado').reduce((a,c) => a + (Number(c.amount) - Number(c.initialPayment || c.amount)), 0);
  
  // Los fijos suman al presupuesto bloqueado si no están pagados
  const fijosPendientes = dataToAnalyze.filter(t => t.type === 'Egreso' && t.frequency === 'Fijo' && t.status !== 'Pagado').reduce((a,c) => a + Number(c.amount), 0);
  
  const saldoLibre = capitalEnBanco - dineroCongelado - fijosPendientes;

  const getAccountBalance = (accName) => {
    const inc = transactions.filter(t => t.type === 'Ingreso' && t.account === accName).reduce((a,c) => a + Number(c.amount), 0);
    const exp = transactions.filter(t => t.type === 'Egreso' && t.account === accName).reduce((a,c) => a + Number(c.category === 'Cashea' ? (c.initialPayment || c.amount) : c.amount), 0);
    return inc - exp;
  };
  const balances = { Binance: getAccountBalance('Binance'), BCP: getAccountBalance('BCP'), BDV: getAccountBalance('BDV') };

  const categoryTotals = dataToAnalyze.filter(t => t.type === 'Egreso').reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
    return acc;
  }, {});
  const totalExpensesFiltered = dataToAnalyze.filter(t => t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const santiPagos = dataToAnalyze.filter(t => t.spender === 'Santi' && t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const patyPagos = dataToAnalyze.filter(t => t.spender === 'Paty' && t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const diff = (santiPagos - patyPagos) / 2;

  // --- HANDLERS ---
  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    
    // Status por defecto: Pendiente si es Cashea o Fijo, Pagado si es gasto inmediato (Comida, etc)
    const initialStatus = (formData.category === 'Cashea' || formData.frequency === 'Fijo') ? 'Pendiente' : 'Pagado';
    
    const data = { ...formData, amount: Number(formData.amount), date: Timestamp.now(), status: initialStatus };
    if (formData.category === 'Cashea') data.initialPayment = Number(formData.initialPayment || formData.amount);
    
    setShowModal(false);
    await addDoc(collection(db, "transactions"), data);
    setFormData({ ...formData, title: '', amount: '', initialPayment: '' });
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositForm.amount) return;
    const data = { title: `Ingreso ${depositForm.category}`, amount: Number(depositForm.amount), spender: depositForm.spender, category: depositForm.category, type: 'Ingreso', account: depositWallet, date: Timestamp.now(), status: 'Completado' };
    setDepositWallet(null);
    await addDoc(collection(db, "transactions"), data);
    setDepositForm({ ...depositForm, amount: '' });
  };

  // NUEVO: Marcar como pagado / des-pagado
  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pagado' ? 'Pendiente' : 'Pagado';
    await updateDoc(doc(db, "transactions", id), { status: newStatus });
  };

  // --- VIEWS ---
  const HomeTab = () => (
    <div className="animate-in fade-in duration-500">
      
      {/* Selector de Arqueo de Tiempo */}
      <div className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-2xl mb-6 shadow-sm">
         <span className="text-[10px] font-black text-slate-400 uppercase ml-3 flex items-center gap-1"><CalendarCheck size={12}/> Arqueo de:</span>
         <select className="bg-[#F2F2F7] text-xs font-bold p-2 rounded-xl outline-none text-slate-800" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
            {availableMonths.map(m => <option key={m} value={m}>{m === 'Global' ? 'Todo el tiempo (Global)' : m}</option>)}
         </select>
      </div>

      <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden border-4 border-slate-800">
          <div className="flex justify-between items-start">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Libre para Paty</p>
             {timeFilter !== 'Global' && <span className="bg-white/10 text-[8px] px-2 py-1 rounded-full">{timeFilter}</span>}
          </div>
          <p className={`text-5xl font-black tracking-tighter ${saldoLibre >= 0 ? 'text-success-green' : 'text-paty-pink'}`}>\$${saldoLibre.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          <p className="text-[10px] font-bold mt-3 uppercase text-slate-400">
            {saldoLibre > 50 ? "🎩 Modo Rockefeller activado" : "🫓 Modo Arepa: Controlar gastos"}
          </p>
      </div>

      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 hide-scrollbar">
          {['Binance', 'BCP', 'BDV'].map(acc => (
            <button key={acc} onClick={() => setDepositWallet(acc)} className="min-w-[140px] bg-white border border-slate-100 p-4 rounded-3xl flex-shrink-0 active:scale-95 transition-all text-left relative">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Wallet size={12}/> {acc}</p>
              <p className="font-black text-xl text-slate-800">\$${balances[acc].toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              <div className="mt-2 text-[8px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full inline-block">Ver o Depositar</div>
            </button>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
          <button onClick={() => setManagerModal('cashea')} className="bg-[#007AFF]/10 p-5 rounded-3xl border border-[#007AFF]/20 shadow-sm relative overflow-hidden active:scale-95 transition-all text-left">
              <Snowflake className="absolute -right-3 -top-3 text-[#007AFF] opacity-10" size={60} />
              <p className="text-[9px] text-[#007AFF] font-black uppercase mb-1 flex items-center justify-between"><span>❄️ Cashea</span> <span className="bg-[#007AFF] text-white px-1.5 rounded-full">{transactions.filter(t => t.category === 'Cashea' && t.status === 'Pendiente').length}</span></p>
              <p className="text-xl text-[#007AFF] font-black">\$${dineroCongelado.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              <p className="text-[8px] font-bold text-[#007AFF]/60 uppercase mt-1">Toca para gestionar ➔</p>
          </button>
          <button onClick={() => setManagerModal('fijos')} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm active:scale-95 transition-all text-left">
              <p className="text-[9px] text-slate-400 font-black uppercase mb-1 flex items-center justify-between"><span>🏠 Fijos Pend.</span> <span className="bg-slate-200 text-slate-500 px-1.5 rounded-full">{dataToAnalyze.filter(t => t.frequency === 'Fijo' && t.status === 'Pendiente').length}</span></p>
              <p className="text-xl text-slate-800 font-black">\$${fijosPendientes.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Toca para gestionar ➔</p>
          </button>
      </div>
    </div>
  );

  const HistoryTab = () => (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex bg-white p-1 rounded-2xl mb-4 text-[10px] font-black shadow-sm border border-slate-100">
        {['Todos', 'Ingreso', 'Egreso'].map(f => (
          <button key={f} onClick={() => setHistoryFilter(f)} className={`flex-1 py-2 rounded-xl transition-all ${historyFilter === f ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{f.toUpperCase()}</button>
        ))}
      </div>
      <div className="space-y-3">
        {dataToAnalyze.filter(t => historyFilter === 'Todos' || t.type === historyFilter).map(t => (
          <div key={t.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${t.type === 'Ingreso' ? 'bg-success-green/10 text-success-green' : 'bg-slate-50'}`}>
                  {t.type === 'Ingreso' ? <ArrowUpCircle size={20}/> : (t.category === 'Cashea' ? '📱' : '🍷')}
               </div>
               <div>
                  <h3 className="font-bold text-sm text-slate-800 leading-none">{t.title}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{t.spender} • {t.account}</p>
               </div>
            </div>
            <div className="text-right">
               <p className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-success-green' : 'text-slate-900'}`}>{t.type === 'Ingreso' ? '+' : '-'}\$${Math.abs(t.amount).toFixed(2)}</p>
               {t.status && <p className={`text-[8px] font-bold uppercase mt-1 ${t.status === 'Pagado' ? 'text-success-green' : 'text-orange-400'}`}>{t.status}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AnalyticsTab = () => (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] mb-6 shadow-xl relative overflow-hidden">
         <h2 className="text-[10px] font-black text-slate-400 uppercase mb-2">Cuentas Claras (50/50) - {timeFilter}</h2>
         {diff !== 0 ? (
           <p className="text-xl font-bold">
             {diff > 0 ? <span className="text-paty-pink">Paty</span> : <span className="text-santi-blue">Santi</span>} compensa con <span className="text-success-green">\$${Math.abs(diff).toFixed(2)}</span>
           </p>
         ) : <p className="text-xl font-bold text-success-green">¡Están a mano este mes! 🤝</p>}
      </div>
      <h2 className="text-xs font-black text-slate-400 uppercase mb-4 px-1">Distribución de Gastos</h2>
      <div className="space-y-2 mb-8">
         {Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]).map(([cat, val]) => (
           <div key={cat} className="bg-white p-4 rounded-3xl border border-slate-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 uppercase">{cat}</span>
              <div className="flex items-center gap-3">
                 <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900" style={{width: `${(val / (totalExpensesFiltered || 1)) * 100}%`}}></div>
                 </div>
                 <span className="text-sm font-black">\$${val.toFixed(0)}</span>
              </div>
           </div>
         ))}
      </div>
    </div>
  );

  // --- COMPONENTE GESTOR DE DEUDAS Y FIJOS ---
  const ManagerModal = () => {
    if(!managerModal) return null;
    const isCashea = managerModal === 'cashea';
    const items = isCashea 
        ? transactions.filter(t => t.category === 'Cashea') 
        : dataToAnalyze.filter(t => t.frequency === 'Fijo');

    return (
      <div className="fixed inset-0 z-[100] flex items-end">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setManagerModal(null)} />
        <div className="relative w-full bg-[#F2F2F7] rounded-t-[3rem] p-6 max-w-md mx-auto shadow-2xl h-[85vh] overflow-y-auto">
          <button onClick={() => setManagerModal(null)} className="absolute top-6 right-6 bg-white p-2 rounded-full text-slate-400 shadow-sm active:scale-90"><X size={20}/></button>
          
          <h2 className={`text-2xl font-black mb-2 ${isCashea ? 'text-[#007AFF]' : 'text-slate-900'}`}>
            {isCashea ? 'Bóveda Cashea' : `Fijos de ${timeFilter}`}
          </h2>
          <p className="text-xs font-bold text-slate-500 mb-6">
            {isCashea ? 'Descongela dinero marcando las cuotas saldadas.' : 'Facturas recurrentes de este arqueo.'}
          </p>

          <div className="space-y-3">
            {items.map(t => (
               <div key={t.id} className={`p-4 rounded-3xl border-2 transition-all ${t.status === 'Pagado' ? 'bg-white border-success-green/20 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-3">
                     <div>
                        <h3 className={`font-black ${t.status === 'Pagado' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{t.title}</h3>
                        {isCashea && <p className="text-[10px] font-bold text-slate-400">Total: \${Number(t.amount).toFixed(2)} | Inicial: \${Number(t.initialPayment).toFixed(2)}</p>}
                     </div>
                     <p className={`font-black text-lg ${t.status === 'Pagado' ? 'text-success-green' : 'text-slate-900'}`}>
                        \$${isCashea ? (Number(t.amount) - Number(t.initialPayment || t.amount)).toFixed(2) : Number(t.amount).toFixed(2)}
                     </p>
                  </div>
                  <button onClick={() => toggleStatus(t.id, t.status)} className={`w-full py-3 rounded-2xl font-black text-xs flex justify-center items-center gap-2 transition-all ${t.status === 'Pagado' ? 'bg-success-green/10 text-success-green' : 'bg-slate-900 text-white active:scale-95'}`}>
                     {t.status === 'Pagado' ? <><CheckCircle2 size={16}/> Saldado (Toca para deshacer)</> : <><Circle size={16}/> Marcar como Pagado</>}
                  </button>
               </div>
            ))}
            {items.length === 0 && <p className="text-center text-slate-400 font-bold mt-10">No hay registros pendientes.</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 text-slate-900 relative">
      
      <div className="bg-slate-900 text-success-green font-mono text-[10px] font-bold py-2 overflow-hidden sticky top-0 z-50 shadow-md w-full whitespace-nowrap">
         <div className="animate-ticker items-center">
            <span className="mx-6 inline-flex items-center gap-1"><Activity size={10}/> 🇻🇪 BCV: Bs. {rates.bcv.toFixed(2)}</span>
            <span className="mx-6 inline-flex items-center gap-1"><TrendingUp size={10}/> 🚀 Paralelo: Bs. {rates.paralelo.toFixed(2)}</span>
            <span className="mx-6 inline-flex items-center gap-1"><Activity size={10}/> 🇵🇪 Soles: S/ {rates.pen.toFixed(2)}</span>
            <span className="mx-6 inline-flex items-center gap-1"><Activity size={10}/> 🇻🇪 BCV: Bs. {rates.bcv.toFixed(2)}</span>
            <span className="mx-6 inline-flex items-center gap-1"><TrendingUp size={10}/> 🚀 Paralelo: Bs. {rates.paralelo.toFixed(2)}</span>
         </div>
      </div>

      <header className="max-w-md mx-auto px-6 pt-6 pb-2">
         <div className="flex justify-between items-start">
            <h1 className="text-4xl font-black tracking-tighter">\$${capitalEnBanco.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h1>
         </div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1 mb-2">Capital Total Global en Billeteras</p>
         
         {syncStatus && <p className="text-[9px] font-bold text-slate-500 mb-3">{syncStatus}</p>}
         
         <div className="flex gap-4 bg-white p-3 rounded-[1.5rem] border border-slate-100 shadow-sm mt-2">
            <div className="flex-1">
               <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">🇻🇪 Oficial (BCV)</p>
               <p className="text-sm font-bold text-slate-700">Bs. {(capitalEnBanco * rates.bcv).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div className="w-px bg-slate-100"></div>
            <div className="flex-1">
               <p className="text-[9px] font-black text-success-green uppercase mb-0.5">🚀 Paralelo</p>
               <p className="text-sm font-bold text-slate-900">Bs. {(capitalEnBanco * rates.paralelo).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
         </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-2">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>

      <ManagerModal />

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe">
        <div className="max-w-md mx-auto px-8 py-3 flex justify-between items-center relative">
          <button onClick={() => setActiveTab('home')} className={`p-2 ${activeTab === 'home' ? 'text-slate-900' : 'text-slate-400'}`}><Home size={22}/></button>
          <button onClick={() => setActiveTab('history')} className={`p-2 ${activeTab === 'history' ? 'text-slate-900' : 'text-slate-400'}`}><List size={22}/></button>
          <div className="w-12"></div>
          <button onClick={() => setActiveTab('analytics')} className={`p-2 ${activeTab === 'analytics' ? 'text-slate-900' : 'text-slate-400'}`}><BarChart3 size={22}/></button>
        </div>
      </div>

      <button onClick={() => setShowModal(true)} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white active:scale-90 transition-all">
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* MODAL DEPOSITO */}
      {depositWallet && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setDepositWallet(null)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-black mb-6">Ingreso a {depositWallet}</h2>
            <form onSubmit={handleDepositSubmit} className="space-y-4">
               <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl">
                  {['Santi', 'Paty'].map(s => <button key={s} type="button" onClick={() => setDepositForm({...depositForm, spender: s})} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${depositForm.spender === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>{s.toUpperCase()}</button>)}
               </div>
               <div className="grid grid-cols-3 gap-2">
                  {['Fijo', 'Freelance', 'Extra'].map(c => <button key={c} type="button" onClick={() => setDepositForm({...depositForm, category: c})} className={`py-3 rounded-xl border-2 text-[10px] font-black ${depositForm.category === c ? 'border-success-green bg-success-green/10 text-success-green' : 'border-slate-100'}`}>{c}</button>)}
               </div>
               <input type="number" step="0.01" placeholder="Monto USD" className="w-full bg-[#F2F2F7] p-5 rounded-3xl outline-none font-black text-3xl text-center" value={depositForm.amount} onChange={e => setDepositForm({...depositForm, amount: e.target.value})} autoFocus />
               <button type="submit" className="w-full bg-success-green text-white p-5 rounded-[2rem] font-black text-lg">Depositar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GASTO */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto shadow-2xl max-h-[92vh] overflow-y-auto">
            <h2 className="text-xl font-black mb-4 text-center">Registrar Gasto</h2>
            <form onSubmit={handleGeneralSubmit} className="space-y-4">
              <div className="flex gap-2">
                {['Binance', 'BCP', 'BDV'].map(acc => <button key={acc} type="button" onClick={() => setFormData({...formData, account: acc})} className={`flex-1 py-3 rounded-2xl font-black text-[10px] border-2 ${formData.account === acc ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100'}`}>{acc}</button>)}
              </div>
              <input type="text" placeholder="¿Concepto?" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" step="0.01" placeholder="Monto Total $" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-black text-3xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                {['Comida', 'Cashea', 'Auto', 'Gym', 'Alquiler', 'Torta'].map(cat => <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' ? 'Fijo' : 'Aleatorio'})} className={`p-3 rounded-xl border-2 text-[10px] font-black ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100'}`}>{cat}</button>)}
              </div>
              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl">
                 {['Santi', 'Paty'].map(s => <button key={s} type="button" onClick={() => setFormData({...formData, spender: s})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === s ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{s.toUpperCase()}</button>)}
              </div>
              {formData.category === 'Cashea' && <input type="number" placeholder="¿Inicial pagada?" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />}
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg">Registrar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
