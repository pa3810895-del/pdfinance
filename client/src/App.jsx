import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Home, List, BarChart3, Plus, ArrowUpCircle, Snowflake, Wallet, TrendingUp, Activity, X, CalendarCheck, CheckCircle2, Circle, Trash2, ArrowRightLeft } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [depositWallet, setDepositWallet] = useState(null);
  const [managerModal, setManagerModal] = useState(null); 
  const [timeFilter, setTimeFilter] = useState('Global');
  
  const [depositForm, setDepositForm] = useState({ amount: '', spender: 'Santi', category: 'Freelance' });
  const [rates, setRates] = useState({ bcv: 475.20, paralelo: 633.50, pen: 3.75 });
  const [syncStatus, setSyncStatus] = useState('Conectando...');

  const [formData, setFormData] = useState({ 
    title: '', amount: '', initialPayment: '', category: 'Comida', spender: 'Santi', type: 'Egreso', frequency: 'Aleatorio', installments: '3', account: 'Binance',
    fromAcc: 'Binance', toAcc: 'BDV' // Para transferencias
  });

  const fetchRates = async () => {
    setSyncStatus('Sincronizando...');
    let bcvVal = 475.20; let parVal = 633.50; let penVal = 3.75; let confirmed = false;
    try {
      const res1 = await fetch('https://ve.dolarapi.com/v1/dolares');
      if(res1.ok) {
        const data1 = await res1.json();
        bcvVal = data1.find(d => d.casa === 'oficial' || d.casa === 'bcv')?.precio || bcvVal;
        parVal = data1.find(d => d.casa === 'paralelo' || d.casa === 'enparalelovzla')?.precio || parVal;
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

    setRates({ bcv: bcvVal, paralelo: parVal, pen: penVal });
    if(confirmed) { setSyncStatus('🟢 Tasas al día'); setTimeout(() => setSyncStatus(''), 4000); } 
    else setSyncStatus('🟠 Modo offline');
  };

  useEffect(() => {
    fetchRates();
    window.addEventListener('focus', fetchRates);
    const now = new Date();
    setTimeFilter(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
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

  const availableMonths = ['Global', ...new Set(transactions.map(t => {
      if(!t.date) return null;
      const d = t.date.toDate();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }).filter(Boolean))];

  const dataToAnalyze = timeFilter === 'Global' 
      ? transactions 
      : transactions.filter(t => t.date && t.date.toDate().toISOString().startsWith(timeFilter));

  // --- MATEMÁTICAS REFINADAS ---
  const globalIncomes = transactions.filter(t => t.type === 'Ingreso').reduce((a,c) => a + Number(c.amount), 0);
  
  // GAP 3 FIX: Ahora los gastos efectivos suman los pagados, y las cuotas pendientes no.
  const globalExpenses = transactions.filter(t => t.type === 'Egreso' && t.status !== 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const capitalEnBanco = globalIncomes - globalExpenses;

  // El dinero congelado es la suma exacta de las cuotas de Cashea marcadas como Pendientes
  const dineroCongelado = transactions.filter(t => t.type === 'Egreso' && t.category === 'Cashea' && t.status === 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const fijosPendientes = dataToAnalyze.filter(t => t.type === 'Egreso' && t.frequency === 'Fijo' && t.status === 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  
  const saldoLibre = capitalEnBanco - dineroCongelado - fijosPendientes;

  // GAP 2 FIX: Saldos de Billeteras incluyen Transferencias Internas
  const getAccountBalance = (accName) => {
    const inc = transactions.filter(t => t.type === 'Ingreso' && t.account === accName).reduce((a,c) => a + Number(c.amount), 0);
    const exp = transactions.filter(t => t.type === 'Egreso' && t.account === accName && t.status !== 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
    const transIn = transactions.filter(t => t.type === 'Transferencia' && t.toAcc === accName).reduce((a,c) => a + Number(c.amount), 0);
    const transOut = transactions.filter(t => t.type === 'Transferencia' && t.fromAcc === accName).reduce((a,c) => a + Number(c.amount), 0);
    return inc - exp + transIn - transOut;
  };
  const balances = { Binance: getAccountBalance('Binance'), BCP: getAccountBalance('BCP'), BDV: getAccountBalance('BDV') };

  const categoryTotals = dataToAnalyze.filter(t => t.type === 'Egreso' && t.category !== 'Cashea').reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
    return acc;
  }, {});
  const totalExpensesFiltered = dataToAnalyze.filter(t => t.type === 'Egreso' && t.status !== 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const santiPagos = dataToAnalyze.filter(t => t.spender === 'Santi' && t.type === 'Egreso' && t.status !== 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const patyPagos = dataToAnalyze.filter(t => t.spender === 'Paty' && t.type === 'Egreso' && t.status !== 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const diff = (santiPagos - patyPagos) / 2;

  // --- HANDLERS AVANZADOS ---
  const handleDeleteTransaction = async (id) => {
    if(window.confirm("¿Seguro que quieres borrar este registro? Esta acción recalculará todo.")) {
      await deleteDoc(doc(db, "transactions", id));
    }
  };

  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return;
    
    // CASO A: Transferencia Interna
    if (formData.type === 'Transferencia') {
      await addDoc(collection(db, "transactions"), {
        type: 'Transferencia',
        title: 'Movimiento Interno',
        amount: Number(formData.amount),
        fromAcc: formData.fromAcc,
        toAcc: formData.toAcc,
        date: Timestamp.now(),
        spender: 'Sistema'
      });
      setShowModal(false);
      setFormData({ ...formData, amount: ''});
      return;
    }

    // CASO B: Cashea Real (División de Cuotas)
    if (formData.category === 'Cashea') {
      const total = Number(formData.amount);
      const inicial = Number(formData.initialPayment || 0);
      const deuda = total - inicial;
      const cuota = deuda / 3;

      // 1. Guardar la Inicial (Gasto real ya pagado)
      await addDoc(collection(db, "transactions"), {
        ...formData,
        title: `(Inicial) ${formData.title}`,
        amount: inicial,
        status: 'Pagado',
        date: Timestamp.now()
      });

      // 2. Proyectar las 3 cuotas futuras
      if (deuda > 0) {
        for (let i = 1; i <= 3; i++) {
          const cuotaDate = new Date();
          cuotaDate.setDate(cuotaDate.getDate() + (i * 14)); // +14, +28, +42 días
          await addDoc(collection(db, "transactions"), {
            ...formData,
            title: `(Cuota ${i}/3) ${formData.title}`,
            amount: cuota,
            status: 'Pendiente',
            date: Timestamp.fromDate(cuotaDate)
          });
        }
      }
      setShowModal(false);
      setFormData({ ...formData, title: '', amount: '', initialPayment: '' });
      return;
    }

    // CASO C: Gasto o Ingreso Normal
    const initialStatus = formData.frequency === 'Fijo' ? 'Pendiente' : 'Pagado';
    await addDoc(collection(db, "transactions"), {
      ...formData,
      amount: Number(formData.amount),
      date: Timestamp.now(),
      status: initialStatus
    });
    
    setShowModal(false);
    setFormData({ ...formData, title: '', amount: '' });
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pagado' ? 'Pendiente' : 'Pagado';
    // Si se marca como pagado, actualiza la fecha al momento del pago real
    await updateDoc(doc(db, "transactions", id), { status: newStatus, date: Timestamp.now() });
  };

  // --- VIEWS ---
  const HistoryTab = () => (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="flex bg-white p-1 rounded-2xl mb-4 text-[10px] font-black shadow-sm border border-slate-100">
        {['Todos', 'Ingreso', 'Egreso', 'Transferencia'].map(f => (
          <button key={f} onClick={() => setHistoryFilter(f)} className={`flex-1 py-2 rounded-xl transition-all ${historyFilter === f ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{f.toUpperCase()}</button>
        ))}
      </div>
      <div className="space-y-3">
        {dataToAnalyze.filter(t => historyFilter === 'Todos' ? true : t.type === historyFilter).map(t => (
          <div key={t.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-50 relative group overflow-hidden">
            
            {/* GAP 1 FIX: Botón de Borrar (Aparece al deslizar/tocar) */}
            <button onClick={() => handleDeleteTransaction(t.id)} className="absolute right-0 top-0 bottom-0 bg-paty-pink text-white w-16 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 z-10 rounded-r-[2rem]">
               <Trash2 size={18}/>
            </button>

            <div className="flex justify-between items-center relative z-0">
              <div className="flex items-center gap-4">
                 <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${t.type === 'Ingreso' ? 'bg-success-green/10 text-success-green' : t.type === 'Transferencia' ? 'bg-[#F3BA2F]/10 text-[#F3BA2F]' : 'bg-slate-50'}`}>
                    {t.type === 'Ingreso' ? <ArrowUpCircle size={20}/> : t.type === 'Transferencia' ? <ArrowRightLeft size={20}/> : (t.category === 'Cashea' ? '📱' : '🍷')}
                 </div>
                 <div>
                    <h3 className="font-bold text-sm text-slate-800 leading-none truncate max-w-[150px]">{t.title}</h3>
                    {t.type === 'Transferencia' ? (
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{t.fromAcc} ➔ {t.toAcc}</p>
                    ) : (
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{t.spender} • {t.account}</p>
                    )}
                 </div>
              </div>
              <div className="text-right pr-6 group-hover:pr-16 transition-all">
                 <p className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-success-green' : t.type === 'Transferencia' ? 'text-slate-400' : 'text-slate-900'}`}>
                    {t.type === 'Ingreso' ? '+' : t.type === 'Transferencia' ? '↔' : '-'}\$${Math.abs(t.amount).toFixed(2)}
                 </p>
                 {t.status && <p className={`text-[8px] font-bold uppercase mt-1 ${t.status === 'Pagado' ? 'text-success-green' : 'text-orange-400'}`}>{t.status}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 text-slate-900 relative">
      <div className="bg-slate-900 text-success-green font-mono text-[10px] font-bold py-2 overflow-hidden sticky top-0 z-50 shadow-md w-full whitespace-nowrap">
         <div className="animate-ticker items-center">
            <span className="mx-6 inline-flex items-center gap-1"><Activity size={10}/> 🇻🇪 BCV: Bs. {rates.bcv.toFixed(2)}</span>
            <span className="mx-6 inline-flex items-center gap-1"><TrendingUp size={10}/> 🚀 Paralelo: Bs. {rates.paralelo.toFixed(2)}</span>
            <span className="mx-6 inline-flex items-center gap-1"><Activity size={10}/> 🇵🇪 Soles: S/ {rates.pen.toFixed(2)}</span>
         </div>
      </div>

      <header className="max-w-md mx-auto px-6 pt-6 pb-2">
         <h1 className="text-4xl font-black tracking-tighter">\$${capitalEnBanco.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1 mb-2">Capital Total Global en Billeteras</p>
         {syncStatus && <p className="text-[9px] font-bold text-slate-500 mb-3">{syncStatus}</p>}
         <div className="flex gap-4 bg-white p-3 rounded-[1.5rem] border border-slate-100 shadow-sm mt-2">
            <div className="flex-1">
               <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">🇻🇪 Oficial (BCV)</p>
               <p className="text-sm font-bold text-slate-700">Bs. {(capitalEnBanco * rates.bcv).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div className="w-px bg-slate-100"></div>
            <div className="flex-1">
               <p className="text-[9px] font-black text-success-green uppercase mb-0.5">🚀 Paralelo</p>
               <p className="text-sm font-bold text-slate-900">Bs. {(capitalEnBanco * rates.paralelo).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
         </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-2">
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-500">
             <div className="flex gap-3 mb-6 overflow-x-auto pb-2 hide-scrollbar mt-4">
                {['Binance', 'BCP', 'BDV'].map(acc => (
                  <button key={acc} className="min-w-[140px] bg-white border border-slate-100 p-4 rounded-3xl flex-shrink-0 active:scale-95 transition-all text-left relative">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Wallet size={12}/> {acc}</p>
                    <p className="font-black text-xl text-slate-800">\$${balances[acc].toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  </button>
                ))}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe">
        <div className="max-w-md mx-auto px-8 py-3 flex justify-between items-center relative">
          <button onClick={() => setActiveTab('home')} className={`p-2 ${activeTab === 'home' ? 'text-slate-900' : 'text-slate-400'}`}><Home size={22}/></button>
          <button onClick={() => setActiveTab('history')} className={`p-2 ${activeTab === 'history' ? 'text-slate-900' : 'text-slate-400'}`}><List size={22}/></button>
          <div className="w-12"></div>
        </div>
      </div>

      <button onClick={() => setShowModal(true)} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white active:scale-90 transition-all">
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* MODAL MAESTRO */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto shadow-2xl max-h-[92vh] overflow-y-auto">
            
            {/* GAP 2 FIX: Tipos de Movimiento incuyendo Transferencias */}
            <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl mb-4 text-[10px]">
               {['Egreso', 'Ingreso', 'Transferencia'].map(type => (
                 <button key={type} type="button" onClick={() => setFormData({...formData, type})} className={`flex-1 py-3 rounded-xl font-black transition-all ${formData.type === type ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>
                    {type === 'Transferencia' ? <ArrowRightLeft size={14} className="mx-auto"/> : type.toUpperCase()}
                 </button>
               ))}
            </div>

            <form onSubmit={handleGeneralSubmit} className="space-y-4">
              
              {formData.type === 'Transferencia' ? (
                <div className="bg-[#F2F2F7] p-4 rounded-3xl space-y-3">
                   <p className="text-xs font-black text-slate-400 uppercase text-center mb-2">Mover Dinero</p>
                   <div className="flex justify-between items-center">
                      <select className="bg-white p-3 rounded-xl font-bold outline-none flex-1" value={formData.fromAcc} onChange={e => setFormData({...formData, fromAcc: e.target.value})}>
                         <option value="Binance">De: Binance</option><option value="BCP">De: BCP</option><option value="BDV">De: BDV</option>
                      </select>
                      <ArrowRightLeft size={16} className="mx-2 text-slate-400"/>
                      <select className="bg-white p-3 rounded-xl font-bold outline-none flex-1" value={formData.toAcc} onChange={e => setFormData({...formData, toAcc: e.target.value})}>
                         <option value="Binance">A: Binance</option><option value="BCP">A: BCP</option><option value="BDV">A: BDV</option>
                      </select>
                   </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    {['Binance', 'BCP', 'BDV'].map(acc => <button key={acc} type="button" onClick={() => setFormData({...formData, account: acc})} className={`flex-1 py-3 rounded-2xl font-black text-[10px] border-2 ${formData.account === acc ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100'}`}>{acc}</button>)}
                  </div>
                  <input type="text" placeholder="¿Concepto?" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </>
              )}

              <input type="number" step="0.01" placeholder="Monto $" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-black text-3xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              
              {formData.type !== 'Transferencia' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {['Comida', 'Cashea', 'Auto', 'Gym', 'Alquiler', 'Torta'].map(cat => <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' ? 'Fijo' : 'Aleatorio'})} className={`p-3 rounded-xl border-2 text-[10px] font-black ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100'}`}>{cat}</button>)}
                  </div>
                  <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl">
                    {['Santi', 'Paty'].map(s => <button key={s} type="button" onClick={() => setFormData({...formData, spender: s})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === s ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{s.toUpperCase()}</button>)}
                  </div>
                </>
              )}

              {/* GAP 3 FIX: Modulo Inteligente Cashea */}
              {formData.category === 'Cashea' && formData.type === 'Egreso' && (
                <div className="p-4 bg-santi-blue/5 rounded-2xl border border-santi-blue/20">
                  <p className="text-[10px] font-black text-[#007AFF] uppercase mb-2">Pagas HOY (Inicial)</p>
                  <input type="number" step="0.01" placeholder="Monto inicial $" className="w-full bg-white p-3 rounded-xl outline-none font-bold text-santi-blue text-sm border border-slate-100" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />
                  <p className="text-[9px] text-slate-500 font-bold mt-2 leading-tight">La app creará automáticamente 3 cuotas futuras por el resto de la deuda.</p>
                </div>
              )}

              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg">
                 {formData.type === 'Transferencia' ? 'Mover Dinero' : 'Registrar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
