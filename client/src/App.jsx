import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Home, List, BarChart3, Plus, ArrowUpCircle, Snowflake, Wallet, TrendingUp, Activity, X, CalendarCheck, RefreshCw, Trash2, ArrowRightLeft } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [depositWallet, setDepositWallet] = useState(null);
  const [managerModal, setManagerModal] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [historyFilter, setHistoryFilter] = useState('Todos');
  const [timeFilter, setTimeFilter] = useState('Global');
  const [rates, setRates] = useState({ bcv: 475.20, paralelo: 633.50, pen: 3.75 });
  const [syncStatus, setSyncStatus] = useState('');

  const [formData, setFormData] = useState({ 
    title: '', amount: '', initialPayment: '', category: 'Comida', spender: 'Santi', type: 'Egreso', frequency: 'Aleatorio', account: 'Binance', fromAcc: 'Binance', toAcc: 'BDV'
  });

  const fetchRates = async () => {
    setSyncStatus('Sincronizando...');
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares');
      const data = await res.json();
      const oficial = data.find(d => d.casa === 'oficial')?.precio || 475.20;
      const paralelo = data.find(d => d.casa === 'paralelo')?.precio || 633.50;
      setRates(prev => ({ ...prev, bcv: oficial, paralelo: paralelo }));
      setSyncStatus('🟢 Tasas al día');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e) { setSyncStatus('🟠 Offline'); }
  };

  useEffect(() => {
    fetchRates();
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const now = new Date();
    setTimeFilter(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return () => unsubscribe();
  }, []);

  // MATEMÁTICAS FILTRADAS
  const dataToAnalyze = timeFilter === 'Global' ? transactions : transactions.filter(t => t.date?.toDate().toISOString().startsWith(timeFilter));
  
  const incomes = transactions.filter(t => t.type === 'Ingreso').reduce((a,c) => a + Number(c.amount), 0);
  const expenses = transactions.filter(t => t.type === 'Egreso' && t.status !== 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const capitalTotal = incomes - expenses;
  
  const congelado = transactions.filter(t => t.category === 'Cashea' && t.status === 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const fijos = dataToAnalyze.filter(t => t.frequency === 'Fijo' && t.status === 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
  const saldoLibre = capitalTotal - congelado - fijos;

  const getBalance = (acc) => {
    const i = transactions.filter(t => t.type === 'Ingreso' && t.account === acc).reduce((a,c) => a + Number(c.amount), 0);
    const e = transactions.filter(t => t.type === 'Egreso' && t.account === acc && t.status !== 'Pendiente').reduce((a,c) => a + Number(c.amount), 0);
    const tIn = transactions.filter(t => t.type === 'Transferencia' && t.toAcc === acc).reduce((a,c) => a + Number(c.amount), 0);
    const tOut = transactions.filter(t => t.type === 'Transferencia' && t.fromAcc === acc).reduce((a,c) => a + Number(c.amount), 0);
    return i - e + tIn - tOut;
  };

  const balances = { Binance: getBalance('Binance'), BCP: getBalance('BCP'), BDV: getBalance('BDV') };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.type === 'Transferencia') {
      await addDoc(collection(db, "transactions"), { ...formData, date: Timestamp.now(), spender: 'Sistema', amount: Number(formData.amount) });
    } else if (formData.category === 'Cashea') {
      const total = Number(formData.amount); const inicial = Number(formData.initialPayment || 0); const cuota = (total - inicial) / 3;
      await addDoc(collection(db, "transactions"), { ...formData, title: `(Inicial) ${formData.title}`, amount: inicial, status: 'Pagado', date: Timestamp.now() });
      for (let i = 1; i <= 3; i++) {
        const d = new Date(); d.setDate(d.getDate() + (i * 14));
        await addDoc(collection(db, "transactions"), { ...formData, title: `(Cuota ${i}/3) ${formData.title}`, amount: cuota, status: 'Pendiente', date: Timestamp.fromDate(d) });
      }
    } else {
      await addDoc(collection(db, "transactions"), { ...formData, amount: Number(formData.amount), date: Timestamp.now(), status: formData.frequency === 'Fijo' ? 'Pendiente' : 'Pagado' });
    }
    setShowModal(false);
    setFormData({ ...formData, title: '', amount: '', initialPayment: '' });
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 text-slate-900 relative overflow-x-hidden">
      <style>{`
        @keyframes scroll { 0% { transform: translateX(100vw); } 100% { transform: translateX(-150%); } }
        .ticker { display: inline-flex; white-space: nowrap; animation: scroll 20s linear infinite; }
      `}</style>

      <div className="bg-slate-900 text-success-green font-mono text-[10px] font-bold py-2 overflow-hidden sticky top-0 z-50">
        <div className="ticker flex items-center">
          <span className="mx-6 flex items-center gap-1"><Activity size={10}/> BCV: Bs. {rates.bcv.toFixed(2)}</span>
          <span className="mx-6 flex items-center gap-1"><TrendingUp size={10}/> Paralelo: Bs. {rates.paralelo.toFixed(2)}</span>
          <span className="mx-6 flex items-center gap-1"><Activity size={10}/> Soles: S/ {rates.pen.toFixed(2)}</span>
        </div>
      </div>

      <header className="max-w-md mx-auto px-6 pt-6 pb-2">
         <div className="flex justify-between items-start">
            <h1 className="text-4xl font-black tracking-tighter">\$${capitalTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
            <button onClick={fetchRates} className="bg-white p-2 rounded-full shadow-sm active:rotate-180 transition-transform"><RefreshCw size={14}/></button>
         </div>
         <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Capital Global (USD)</p>
         {syncStatus && <p className="text-[9px] font-bold text-slate-500 mt-2">{syncStatus}</p>}
      </header>

      <main className="max-w-md mx-auto px-6 pt-4">
        {activeTab === 'home' ? (
          <>
            <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] mb-6 border-4 border-slate-800 shadow-xl relative overflow-hidden">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Saldo Disponible Paty</p>
               <p className={`text-5xl font-black tracking-tighter ${saldoLibre >= 0 ? 'text-success-green' : 'text-paty-pink'}`}>\$${saldoLibre.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2 hide-scrollbar">
              {['Binance', 'BCP', 'BDV'].map(acc => (
                <div key={acc} className="min-w-[140px] bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{acc}</p>
                  <p className="font-black text-lg text-slate-800">\$${balances[acc].toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-[#007AFF]/10 p-5 rounded-3xl border border-[#007AFF]/20">
                  <p className="text-[9px] font-black text-[#007AFF] uppercase mb-1">❄️ Congelado</p>
                  <p className="text-xl font-black text-[#007AFF]">\$${congelado.toLocaleString()}</p>
               </div>
               <div className="bg-white p-5 rounded-3xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">🏠 Fijos</p>
                  <p className="text-xl font-black text-slate-800">\$${fijos.toLocaleString()}</p>
               </div>
            </div>
          </>
        ) : (
          <div className="space-y-3 pb-10">
            {dataToAnalyze.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-50 flex justify-between items-center group relative overflow-hidden">
                <button onClick={async () => { if(window.confirm("¿Borrar?")) await deleteDoc(doc(db, "transactions", t.id)) }} className="absolute right-0 top-0 bottom-0 bg-paty-pink text-white w-12 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.type === 'Ingreso' ? 'bg-success-green/10 text-success-green' : 'bg-slate-50'}`}>
                    {t.type === 'Ingreso' ? <ArrowUpCircle size={18}/> : <ArrowRightLeft size={18}/>}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 leading-tight">{t.title}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{t.account || t.fromAcc} • {t.status || 'Pagado'}</p>
                  </div>
                </div>
                <p className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-success-green' : 'text-slate-900'}`}>\$${Math.abs(t.amount).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-4 flex justify-around z-40">
        <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-slate-900' : 'text-slate-400'}><Home/></button>
        <button onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'text-slate-900' : 'text-slate-400'}><List/></button>
        <button onClick={() => setActiveTab('analytics')} className={activeTab === 'analytics' ? 'text-slate-900' : 'text-slate-400'}><BarChart3/></button>
      </nav>

      <button onClick={() => setShowModal(true)} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white active:scale-90 transition-all">
        <Plus size={28} strokeWidth={3} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl mb-4 text-[10px] font-black">
              {['Egreso', 'Ingreso', 'Transferencia'].map(type => (
                <button key={type} type="button" onClick={() => setFormData({...formData, type})} className={`flex-1 py-3 rounded-xl transition-all ${formData.type === type ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{type.toUpperCase()}</button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formData.type === 'Transferencia' ? (
                <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl">
                  <select className="flex-1 bg-transparent font-bold outline-none" value={formData.fromAcc} onChange={e => setFormData({...formData, fromAcc: e.target.value})}><option value="Binance">Binance</option><option value="BCP">BCP</option><option value="BDV">BDV</option></select>
                  <ArrowRightLeft size={14} className="text-slate-300"/>
                  <select className="flex-1 bg-transparent font-bold outline-none" value={formData.toAcc} onChange={e => setFormData({...formData, toAcc: e.target.value})}><option value="Binance">Binance</option><option value="BCP">BCP</option><option value="BDV">BDV</option></select>
                </div>
              ) : (
                <div className="flex gap-2">
                  {['Binance', 'BCP', 'BDV'].map(acc => <button key={acc} type="button" onClick={() => setFormData({...formData, account: acc})} className={`flex-1 py-2 rounded-xl text-[10px] font-black border-2 ${formData.account === acc ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100'}`}>{acc}</button>)}
                </div>
              )}
              <input type="text" placeholder="Concepto" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" step="0.01" placeholder="Monto $" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-black text-4xl text-center text-slate-800" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                {['Comida', 'Cashea', 'Auto', 'Gym', 'Alquiler', 'Torta'].map(cat => <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' ? 'Fijo' : 'Aleatorio'})} className={`p-3 rounded-xl border-2 text-[10px] font-black ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100'}`}>{cat}</button>)}
              </div>
              {formData.category === 'Cashea' && <input type="number" placeholder="Inicial pagada $" className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 font-bold" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />}
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg">Guardar Registro</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
