// Service Worker Registration
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then(reg => console.log('[SW] Registered'))
      .catch(err => console.log('[SW] Failed:', err));
  });
}

import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, updateDoc, doc, deleteDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { Home, List, BarChart3, Plus, ArrowUpCircle, Snowflake, Wallet, TrendingUp, Activity, X, CalendarCheck, RefreshCw, Trash2, ArrowRightLeft, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [timeFilter, setTimeFilter] = useState('');
  const [rates, setRates] = useState({ bcv: 475.20, paralelo: 633.50, pen: 3.75 });
  const [toast, setToast] = useState(null);
  
  const [formData, setFormData] = useState({ 
    title: '', amount: '', initialPayment: '', category: 'Comida', spender: 'Santi', 
    type: 'Egreso', frequency: 'Aleatorio', account: 'Binance', fromAcc: 'Binance', 
    toAcc: 'BDV', installments: '3' 
  });

  const showNotify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRates = async () => {
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares');
      const data = await res.json();
      const oficial = data.find(d => d.casa === 'oficial')?.precio || 475.20;
      const paralelo = data.find(d => d.casa === 'paralelo')?.precio || 633.50;
      setRates(prev => ({ ...prev, bcv: oficial, paralelo: paralelo }));
    } catch (e) { showNotify("Usando tasas locales", "info"); }
  };

  useEffect(() => {
    fetchRates();
    const now = new Date();
    setTimeFilter(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // --- MATEMÁTICAS ---
  const balances = useMemo(() => {
    const accs = { Binance: 0, BCP: 0, BDV: 0 };
    transactions.forEach(t => {
      const amt = Number(t.amount);
      if (t.type === 'Ingreso') accs[t.account] += amt;
      if (t.type === 'Egreso' && t.status === 'Pagado') accs[t.account] -= amt;
      if (t.type === 'Transferencia') {
        accs[t.fromAcc] -= amt;
        accs[t.toAcc] += amt;
      }
    });
    return accs;
  }, [transactions]);

  const capitalGlobal = Object.values(balances).reduce((a, b) => a + b, 0);
  const currentMonthData = transactions.filter(t => t.date?.toDate().toISOString().startsWith(timeFilter));
  const deudasTotal = transactions.filter(t => t.status === 'Pendiente').reduce((a, c) => a + Number(c.amount), 0);
  const saldoLibre = capitalGlobal - deudasTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(formData.amount);
    if (!amt) return;

    if (formData.type === 'Egreso' && balances[formData.account] < amt && !window.confirm("Fondos insuficientes en esta cuenta. ¿Continuar?")) return;

    try {
      const common = { ...formData, amount: amt, date: Timestamp.now(), histRate: rates };
      
      if (formData.type === 'Transferencia') {
        await addDoc(collection(db, "transactions"), { ...common, spender: 'Sistema' });
      } else if (formData.category === 'Cashea') {
        const gid = `group_${Date.now()}`;
        const inicial = Number(formData.initialPayment || 0);
        const num = Number(formData.installments);
        const cuota = (amt - inicial) / num;
        
        await addDoc(collection(db, "transactions"), { ...common, title: `(Inicial) ${formData.title}`, amount: inicial, status: 'Pagado', groupId: gid });
        for (let i = 1; i <= num; i++) {
          const d = new Date(); d.setDate(d.getDate() + (i * 14));
          await addDoc(collection(db, "transactions"), { ...common, title: `(Cuota ${i}/${num}) ${formData.title}`, amount: cuota, status: 'Pendiente', groupId: gid, date: Timestamp.fromDate(d) });
        }
      } else {
        await addDoc(collection(db, "transactions"), { ...common, status: formData.frequency === 'Fijo' ? 'Pendiente' : 'Pagado' });
      }
      showNotify("¡Registro exitoso!");
      setShowModal(false);
      setFormData({ ...formData, title: '', amount: '', initialPayment: '' });
    } catch (err) { showNotify("Error al guardar", "error"); }
  };

  const deleteItem = async (t) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      if (t.groupId) {
        if (window.confirm("Este es parte de una compra grupal (Cashea). ¿Eliminar TODA la compra?")) {
          const q = query(collection(db, "transactions"), where("groupId", "==", t.groupId));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.forEach(d => batch.delete(d.ref));
          await batch.commit();
        } else { await deleteDoc(doc(db, "transactions", t.id)); }
      } else { await deleteDoc(doc(db, "transactions", t.id)); }
      showNotify("Eliminado correctamente");
    } catch (e) { showNotify("Error al borrar", "error"); }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 text-slate-900 overflow-x-hidden">
      {/* TOASTS */}
      {toast && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-300 ${toast.type === 'error' ? 'bg-paty-pink text-white' : 'bg-slate-900 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16} className="text-success-green"/>}
          <span className="text-xs font-bold">{toast.msg}</span>
        </div>
      )}

      {/* TICKER */}
      <div className="bg-slate-900 text-success-green font-mono text-[10px] font-bold py-2 overflow-hidden sticky top-0 z-50">
        <div className="flex animate-marquee whitespace-nowrap">
          <span className="mx-8 flex items-center gap-1"><Activity size={10}/> BCV: {rates.bcv.toFixed(2)}</span>
          <span className="mx-8 flex items-center gap-1"><TrendingUp size={10}/> Paralelo: {rates.paralelo.toFixed(2)}</span>
          <span className="mx-8 flex items-center gap-1"><Activity size={10}/> BCV: {rates.bcv.toFixed(2)}</span>
          <span className="mx-8 flex items-center gap-1"><TrendingUp size={10}/> Paralelo: {rates.paralelo.toFixed(2)}</span>
        </div>
      </div>

      <header className="max-w-md mx-auto px-7 pt-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-5xl font-black tracking-tighter">\$${capitalGlobal.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Capital Total Real</p>
          </div>
          <button onClick={fetchRates} className="p-3 bg-white rounded-full shadow-sm active:rotate-180 transition-all duration-700 border border-slate-100"><RefreshCw size={18} className="text-slate-400"/></button>
        </div>
        <div className="flex gap-4 bg-white/50 backdrop-blur-md p-4 rounded-[2rem] border border-white shadow-sm mb-6">
            <div className="flex-1">
               <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Equivalente Paralelo</p>
               <p className="text-sm font-black text-slate-700">Bs. {(capitalGlobal * rates.paralelo).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div className="flex-1 text-right">
               <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Status</p>
               <p className="text-sm font-black text-success-green">PROTEGIDO 🛡️</p>
            </div>
         </div>
      </header>

      <main className="max-w-md mx-auto px-7">
        {activeTab === 'home' ? (
          <div className="animate-in fade-in duration-700">
            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl mb-6 relative overflow-hidden">
               <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Saldo Disponible (Paty)</p>
               <h2 className={`text-5xl font-black tracking-tighter ${saldoLibre >= 0 ? 'text-success-green' : 'text-paty-pink'}`}>\$${saldoLibre.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
               <p className="text-[9px] text-slate-400 mt-4 font-bold">Reserva de Emergencia: \$${deudasTotal.toFixed(0)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['Binance', 'BCP', 'BDV'].map(acc => (
                <div key={acc} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{acc}</p>
                  <p className="text-sm font-black text-slate-800">\$${balances[acc].toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-20">
            {currentMonthData.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-[2rem] border border-slate-50 flex justify-between items-center group relative overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.type === 'Ingreso' ? 'bg-success-green/10 text-success-green' : 'bg-slate-50'}`}>
                    {t.type === 'Ingreso' ? <ArrowUpCircle size={18}/> : t.type === 'Transferencia' ? <ArrowRightLeft size={18}/> : <CreditCard size={18}/>}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs leading-none mb-1">{t.title}</h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase">{t.account || t.fromAcc} • {t.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-success-green' : 'text-slate-900'}`}>\$${Math.abs(t.amount).toFixed(2)}</p>
                  <button onClick={() => deleteItem(t)} className="text-slate-200 hover:text-paty-pink transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] bg-slate-900 rounded-full p-2 flex justify-between items-center z-40 shadow-2xl border border-white/10">
        <button onClick={() => setActiveTab('home')} className={`flex-1 flex justify-center p-3 rounded-full ${activeTab === 'home' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><Home size={20}/></button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 flex justify-center p-3 rounded-full ${activeTab === 'history' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><List size={20}/></button>
        <button onClick={() => setActiveTab('analytics')} className={`flex-1 flex justify-center p-3 rounded-full ${activeTab === 'analytics' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><BarChart3 size={20}/></button>
      </nav>

      <button onClick={() => setShowModal(true)} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-success-green text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-[#F2F2F7] active:scale-95 transition-all">
        <Plus size={28} strokeWidth={3} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3.5rem] p-10 max-w-md mx-auto shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex bg-[#F2F2F7] p-1 rounded-2xl mb-6">
              {['Egreso', 'Ingreso', 'Transferencia'].map(type => (
                <button key={type} type="button" onClick={() => setFormData({...formData, type})} className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${formData.type === type ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{type.toUpperCase()}</button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formData.type === 'Transferencia' ? (
                <div className="flex gap-2 items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <select className="flex-1 bg-transparent font-black text-xs outline-none" value={formData.fromAcc} onChange={e => setFormData({...formData, fromAcc: e.target.value})}><option>Binance</option><option>BCP</option><option>BDV</option></select>
                  <ArrowRightLeft size={14} className="text-slate-300"/>
                  <select className="flex-1 bg-transparent font-black text-xs outline-none" value={formData.toAcc} onChange={e => setFormData({...formData, toAcc: e.target.value})}><option>Binance</option><option>BCP</option><option>BDV</option></select>
                </div>
              ) : (
                <div className="flex gap-2">
                  {['Binance', 'BCP', 'BDV'].map(acc => <button key={acc} type="button" onClick={() => setFormData({...formData, account: acc})} className={`flex-1 py-3 rounded-2xl text-[10px] font-black border-2 ${formData.account === acc ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100'}`}>{acc}</button>)}
                </div>
              )}
              <input type="text" placeholder="¿Concepto?" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" step="0.01" placeholder="Monto $" className="w-full bg-[#F2F2F7] p-5 rounded-3xl outline-none font-black text-4xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              
              {formData.type === 'Egreso' && (
                <div className="grid grid-cols-4 gap-2">
                  {['Comida', 'Cashea', 'Auto', 'Alquiler'].map(cat => <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' ? 'Fijo' : 'Aleatorio'})} className={`py-3 rounded-xl text-[8px] font-black border-2 transition-all ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100'}`}>{cat.toUpperCase()}</button>)}
                </div>
              )}

              {formData.category === 'Cashea' && formData.type === 'Egreso' && (
                <div className="p-4 bg-santi-blue/5 rounded-2xl border border-santi-blue/20">
                  <div className="flex gap-2 mb-3">
                    {['3', '6', '9'].map(n => <button key={n} type="button" onClick={() => setFormData({...formData, installments: n})} className={`flex-1 py-2 rounded-lg text-[10px] font-black ${formData.installments === n ? 'bg-santi-blue text-white' : 'bg-white text-santi-blue'}`}>{n} CUOTAS</button>)}
                  </div>
                  <input type="number" placeholder="Inicial pagada hoy $" className="w-full bg-white p-3 rounded-xl border border-slate-100 font-bold text-xs" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />
                </div>
              )}
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2.5rem] font-black text-lg active:scale-95 transition-all">Confirmar Registro</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
