import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Home, List, BarChart3, Plus, ArrowUpCircle, Snowflake, Wallet, TrendingUp, Activity, X, Calendar } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [depositWallet, setDepositWallet] = useState(null);
  const [depositForm, setDepositForm] = useState({ amount: '', spender: 'Santi', category: 'Freelance' });
  const [activeTab, setActiveTab] = useState('home');
  const [historyFilter, setHistoryFilter] = useState('Todos');

  // FIX QA: Valores de respaldo ajustados a la realidad económica actual
  const [rates, setRates] = useState({ bcv: 475.20, paralelo: 633.50, pen: 3.75 });

  const [formData, setFormData] = useState({ 
    title: '', amount: '', initialPayment: '', category: 'Comida', spender: 'Santi', type: 'Egreso', frequency: 'Aleatorio', installments: '3', account: 'Binance'
  });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const peRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const peData = await peRes.json();
        const veRes = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar');
        const veData = await veRes.json();
        setRates({
          bcv: veData?.monitors?.bcv?.price || 475.20,
          paralelo: veData?.monitors?.enparalelovzla?.price || 633.50,
          pen: peData?.rates?.PEN || 3.75
        });
      } catch (e) { console.warn("Modo offline: Usando tasas predeterminadas del QA."); }
    };
    fetchRates();
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
  const gastosEfectivos = transactions.filter(t => t.type === 'Egreso').reduce((a,c) => a + Number(c.category === 'Cashea' ? (c.initialPayment || c.amount) : c.amount), 0);
  const capitalEnBanco = totalIncomes - gastosEfectivos;
  const dineroCongelado = transactions.filter(t => t.type === 'Egreso' && t.category === 'Cashea').reduce((a,c) => a + (Number(c.amount) - Number(c.initialPayment || c.amount)), 0);
  const totalFixedCosts = transactions.filter(t => t.type === 'Egreso' && t.frequency === 'Fijo').reduce((a,c) => a + Number(c.amount), 0);
  const saldoLibre = capitalEnBanco - dineroCongelado - totalFixedCosts;

  // --- ANALYTICS DATA ---
  const categoryTotals = transactions.filter(t => t.type === 'Egreso').reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
    return acc;
  }, {});
  const totalExpenses = transactions.filter(t => t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);

  const santiPagos = transactions.filter(t => t.spender === 'Santi' && t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const patyPagos = transactions.filter(t => t.spender === 'Paty' && t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const diff = (santiPagos - patyPagos) / 2;

  // --- HANDLERS ---
  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    const data = { ...formData, amount: Number(formData.amount), date: Timestamp.now() };
    if (formData.category === 'Cashea') data.initialPayment = Number(formData.initialPayment || formData.amount);
    setShowModal(false);
    await addDoc(collection(db, "transactions"), data);
    setFormData({ ...formData, title: '', amount: '', initialPayment: '' });
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositForm.amount) return;
    const data = { title: `Ingreso ${depositForm.category}`, amount: Number(depositForm.amount), spender: depositForm.spender, category: depositForm.category, type: 'Ingreso', account: depositWallet, date: Timestamp.now() };
    setDepositWallet(null);
    await addDoc(collection(db, "transactions"), data);
    setDepositForm({ ...depositForm, amount: '' });
  };

  // --- VIEWS ---
  const HomeTab = () => (
    <div className="animate-in fade-in duration-500">
      <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden border-4 border-slate-800">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Libre para Paty</p>
          <p className={`text-5xl font-black tracking-tighter ${saldoLibre >= 0 ? 'text-success-green' : 'text-paty-pink'}`}>\$${saldoLibre.toLocaleString()}</p>
          <p className="text-[10px] font-bold mt-3 uppercase text-slate-400">
            {saldoLibre > 50 ? "🎩 Modo Rockefeller activado" : "🫓 Modo Arepa: Controlar gastos"}
          </p>
      </div>

      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 hide-scrollbar">
          {['Binance', 'BCP', 'BDV'].map(acc => (
            <button key={acc} onClick={() => setDepositWallet(acc)} className="min-w-[140px] bg-white border border-slate-100 p-4 rounded-3xl flex-shrink-0 active:scale-95 transition-all text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Wallet size={12}/> {acc}</p>
              <p className="font-black text-lg text-slate-800">\$${(totalIncomes - transactions.filter(t => t.account === acc && t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0)).toLocaleString()}</p>
            </button>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-[#007AFF]/10 p-5 rounded-3xl border border-[#007AFF]/20 shadow-sm relative overflow-hidden">
              <Snowflake className="absolute -right-3 -top-3 text-[#007AFF] opacity-10" size={60} />
              <p className="text-[9px] text-[#007AFF] font-black uppercase mb-1">❄️ Cashea</p>
              <p className="text-xl text-[#007AFF] font-black">\$${dineroCongelado.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[9px] text-slate-400 uppercase mb-1">🏠 Fijos</p>
              <p className="text-xl text-slate-800 font-black">\$${totalFixedCosts.toLocaleString()}</p>
          </div>
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
        {transactions.filter(t => historyFilter === 'Todos' || t.type === historyFilter).map(t => (
          <div key={t.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${t.type === 'Ingreso' ? 'bg-success-green/10 text-success-green' : 'bg-slate-50'}`}>
                  {t.type === 'Ingreso' ? <ArrowUpCircle size={20}/> : (t.category === 'Cashea' ? '📱' : '🍷')}
               </div>
               <div>
                  <h3 className="font-bold text-sm text-slate-800 leading-none">{t.title}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{t.spender} • {t.account}</p>
               </div>
            </div>
            <p className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-success-green' : 'text-slate-900'}`}>{t.type === 'Ingreso' ? '+' : '-'}\$${Math.abs(t.amount).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const AnalyticsTab = () => (
    <div className="animate-in fade-in duration-500 pb-10">
      <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] mb-6 shadow-xl relative overflow-hidden">
         <h2 className="text-[10px] font-black text-slate-400 uppercase mb-2">Cuentas Claras (50/50)</h2>
         {diff !== 0 ? (
           <p className="text-xl font-bold">
             {diff > 0 ? <span className="text-paty-pink">Paty</span> : <span className="text-santi-blue">Santi</span>} debe aportar <span className="text-success-green">\$${Math.abs(diff).toFixed(2)}</span> a la bolsa.
           </p>
         ) : <p className="text-xl font-bold text-success-green">¡Están a mano! 🤝</p>}
      </div>
      <h2 className="text-xs font-black text-slate-400 uppercase mb-4 px-1">Distribución de Gastos</h2>
      <div className="space-y-2 mb-8">
         {Object.entries(categoryTotals).map(([cat, val]) => (
           <div key={cat} className="bg-white p-4 rounded-3xl border border-slate-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 uppercase">{cat}</span>
              <div className="flex items-center gap-3">
                 <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900" style={{width: `${(val / (totalExpenses || 1)) * 100}%`}}></div>
                 </div>
                 <span className="text-sm font-black">\$${val.toFixed(0)}</span>
              </div>
           </div>
         ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 text-slate-900 relative">
      
      {/* FIX QA: TICKER WALL STREET FORZADO HORIZONTAL */}
      <div className="bg-slate-900 text-success-green font-mono text-[10px] font-bold py-2 overflow-hidden sticky top-0 z-50 shadow-md w-full whitespace-nowrap">
         <div className="animate-ticker items-center">
            <span className="mx-6 inline-flex items-center gap-1"><Activity size={10}/> 🇻🇪 BCV: Bs. {rates.bcv.toFixed(2)}</span>
            <span className="mx-6 inline-flex items-center gap-1"><TrendingUp size={10}/> 🚀 Paralelo: Bs. {rates.paralelo.toFixed(2)}</span>
            <span className="mx-6 inline-flex items-center gap-1"><Activity size={10}/> 🇵🇪 Soles: S/ {rates.pen.toFixed(2)}</span>
            <span className="mx-6 inline-flex items-center gap-1"><Activity size={10}/> 🇻🇪 BCV: Bs. {rates.bcv.toFixed(2)}</span>
            <span className="mx-6 inline-flex items-center gap-1"><TrendingUp size={10}/> 🚀 Paralelo: Bs. {rates.paralelo.toFixed(2)}</span>
         </div>
      </div>

      <header className="max-w-md mx-auto px-6 pt-8 pb-4">
         <h1 className="text-3xl font-black tracking-tighter">\$${capitalEnBanco.toLocaleString()}</h1>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Capital en Banco (USD)</p>
      </header>

      <main className="max-w-md mx-auto px-6">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>

      {/* FOOTER NAV */}
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
