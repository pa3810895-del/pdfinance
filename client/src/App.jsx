import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Home, List, PieChart, Plus, ArrowUpCircle, Snowflake } from 'lucide-react';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [historyFilter, setHistoryFilter] = useState('Todos');
  const [formData, setFormData] = useState({ 
    title: '', amount: '', initialPayment: '', category: 'Comida', spender: 'Santi', type: 'Egreso', frequency: 'Aleatorio', installments: '3' 
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

  // --- MATEMÁTICAS DE CONGELAMIENTO (CASH FLOW VS BUDGET) ---
  
  const totalIncomes = transactions.filter(t => t.type === 'Ingreso').reduce((a,c) => a + Number(c.amount), 0);
  
  // Lo que realmente ha salido del banco (Si es Cashea, solo la inicial. Si es otro, el monto completo)
  const gastosEfectivos = transactions.filter(t => t.type === 'Egreso').reduce((a,c) => {
    if (c.category === 'Cashea') return a + Number(c.initialPayment || c.amount);
    return a + Number(c.amount);
  }, 0);

  // Capital físico en el Banco (BNC, BDV, Efectivo)
  const capitalEnBanco = totalIncomes - gastosEfectivos;

  // Dinero Congelado (Deuda de cuotas de Cashea no pagadas)
  const dineroCongelado = transactions.filter(t => t.type === 'Egreso' && t.category === 'Cashea').reduce((a,c) => {
    const total = Number(c.amount);
    const pagado = Number(c.initialPayment || total);
    return a + (total - pagado); // Lo que falta por pagar se congela
  }, 0);

  // Gastos fijos (Alquiler, Internet, etc)
  const totalFixedCosts = transactions.filter(t => t.type === 'Egreso' && t.frequency === 'Fijo').reduce((a,c) => a + Number(c.amount), 0);

  // EL NÚMERO MÁGICO PARA PATY
  const saldoLibre = capitalEnBanco - dineroCongelado - totalFixedCosts;

  // LÓGICA "CUENTAS CLARAS"
  const santiPagos = transactions.filter(t => t.spender === 'Santi' && t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const patyPagos = transactions.filter(t => t.spender === 'Paty' && t.type === 'Egreso').reduce((a,c) => a + Number(c.amount), 0);
  const mitad = (santiPagos + patyPagos) / 2;
  
  let deudor = null;
  let montoDeuda = 0;
  if (santiPagos > patyPagos) {
    deudor = 'Paty';
    montoDeuda = mitad - patyPagos;
  } else if (patyPagos > santiPagos) {
    deudor = 'Santi';
    montoDeuda = mitad - santiPagos;
  }

  // MÓDULO DEBUG PARA LA IA
  const copyDebugInfo = () => {
    const r = { t: new Date().toISOString(), cap: capitalEnBanco, libre: saldoLibre, cong: dineroCongelado, fix: totalFixedCosts, d: { s: santiPagos, p: patyPagos }, raw: transactions.slice(0,5) };
    navigator.clipboard.writeText(JSON.stringify(r));
    alert("🛠️ Datos de Bóveda Copiados");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    
    // Auto-completar pago inicial si no es Cashea
    const dataToSave = { ...formData, amount: Number(formData.amount), date: Timestamp.now() };
    if (formData.category === 'Cashea' && formData.initialPayment) {
      dataToSave.initialPayment = Number(formData.initialPayment);
    } else {
      dataToSave.initialPayment = Number(formData.amount); // Si no es Cashea, pagas todo de una
    }

    await addDoc(collection(db, "transactions"), dataToSave);
    setFormData({ ...formData, title: '', amount: '', initialPayment: '' });
    setShowModal(false);
  };

  // --- COMPONENTES ---

  const HomeTab = () => (
    <div className="animate-in fade-in duration-300">
      
      {/* Tarjeta de Decisión (El Café de Paty) */}
      <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden border-4 border-slate-800">
          <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Libre (Para Gastar)</p>
              <span className="text-2xl">{saldoLibre >= 10 ? '☕️✅' : '🚫🍰'}</span>
          </div>
          <div className="relative z-10">
            <p className={`text-5xl font-black tracking-tighter ${saldoLibre >= 0 ? 'text-success-green' : 'text-paty-pink'}`}>
              \$${saldoLibre.toLocaleString()}
            </p>
            <p className="text-xs font-bold text-slate-400 mt-2">
              Capital en Banco: <span className="text-white">\$${capitalEnBanco.toLocaleString()}</span>
            </p>
          </div>
      </div>

      {/* Las Bóvedas de Congelamiento */}
      <div className="grid grid-cols-2 gap-3 mb-8 text-center font-bold">
          <div className="bg-[#007AFF]/10 p-5 rounded-3xl border border-[#007AFF]/20 shadow-sm relative overflow-hidden">
              <Snowflake className="absolute -right-3 -top-3 text-[#007AFF] opacity-10" size={80} />
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
            <div key={t.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${t.type === 'Ingreso' ? 'bg-success-green/10' : t.category === 'Cashea' ? 'bg-[#007AFF]/10' : 'bg-slate-50'}`}>
                    {t.type === 'Ingreso' ? <ArrowUpCircle className="text-success-green" size={24}/> : (t.category === 'Comida' ? '🍷' : t.category === 'Cashea' ? '📱' : t.category === 'Proyectos' ? '🚀' : '💸')}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-slate-800">{t.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t.spender} • {t.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-black text-sm ${t.type === 'Ingreso' ? 'text-success-green' : 'text-slate-900'}`}>
                    {t.type === 'Ingreso' ? '+' : '-'}\$${Math.abs(t.amount).toFixed(2)}
                  </span>
                </div>
              </div>
              {/* Si es Cashea, muestra el detalle de la deuda */}
              {t.category === 'Cashea' && t.type === 'Egreso' && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Inicial: \$${(t.initialPayment || t.amount).toFixed(2)}</span>
                  <span className="text-[#007AFF] flex items-center gap-1"><Snowflake size={10}/> Congelado: \$${(t.amount - (t.initialPayment || t.amount)).toFixed(2)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const AnalyticsTab = () => (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Cuentas Claras</h2>
      <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm mb-6 relative overflow-hidden">
        <h3 className="font-bold text-sm mb-1 text-slate-500">Balance de Pareja (50/50)</h3>
        {montoDeuda > 0 ? (
          <div>
            <p className="text-2xl font-black mt-2 text-slate-800"><span className={deudor === 'Santi' ? 'text-santi-blue' : 'text-paty-pink'}>{deudor}</span> compensa:</p>
            <p className="text-5xl font-black mt-1 text-slate-900">\$${montoDeuda.toFixed(2)}</p>
          </div>
        ) : (
          <p className="text-2xl font-black text-success-green mt-4">¡Están a mano! 🤝</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32 select-none text-slate-900">
      <button onClick={copyDebugInfo} className="fixed bottom-4 left-4 w-10 h-10 opacity-[0.02] z-[100]">🛠️</button>

      <div className="max-w-md mx-auto sticky top-0 z-30 px-6 pt-12 pb-4 backdrop-blur-xl bg-[#F2F2F7]/90">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">\$${capitalEnBanco.toLocaleString()}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Cuenta (Líquido)</p>
          </div>
          <div className="flex -space-x-3">
             <div className="w-9 h-9 rounded-full bg-santi-blue text-white flex items-center justify-center text-xs font-black border-2 border-[#F2F2F7]">S</div>
             <div className="w-9 h-9 rounded-full bg-paty-pink text-white flex items-center justify-center text-xs font-black border-2 border-[#F2F2F7]">P</div>
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
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-8" />
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl">
                <button type="button" onClick={() => setFormData({...formData, spender: 'Santi'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Santi' ? 'bg-santi-blue text-white shadow-md' : 'text-slate-400'}`}>SANTI</button>
                <button type="button" onClick={() => setFormData({...formData, spender: 'Paty'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${formData.spender === 'Paty' ? 'bg-paty-pink text-white shadow-md' : 'text-slate-400'}`}>PATY</button>
              </div>
              <div className="flex bg-[#F2F2F7] p-1.5 rounded-2xl mb-4 text-xs">
                <button type="button" onClick={() => setFormData({...formData, type: 'Egreso'})} className={`flex-1 py-3 rounded-xl font-black ${formData.type === 'Egreso' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>GASTO</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'Ingreso'})} className={`flex-1 py-3 rounded-xl font-black ${formData.type === 'Ingreso' ? 'bg-success-green text-white shadow-md' : 'text-slate-400'}`}>INGRESO</button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                {['Comida', 'Cashea', 'Auto', 'Gym', 'Alquiler', 'Proyectos', 'Torta'].map(cat => (
                  <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat, frequency: cat === 'Alquiler' ? 'Fijo' : 'Aleatorio'})} className={`p-3 rounded-xl border-2 transition-all ${formData.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white'}`}>{cat}</button>
                ))}
              </div>

              <input type="text" placeholder="¿Concepto?" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" step="0.01" placeholder="Costo Total $" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none font-black text-3xl text-center" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />

              {formData.category === 'Cashea' && formData.type === 'Egreso' && (
                <div className="p-5 bg-santi-blue/5 rounded-3xl border border-santi-blue/20">
                  <p className="text-[10px] font-black text-santi-blue uppercase mb-3 flex items-center gap-1"><Snowflake size={14}/> Detalle de Congelamiento</p>
                  <input type="number" step="0.01" placeholder="¿Cuánto pagaste HOY de inicial? $" className="w-full bg-white p-4 rounded-xl outline-none font-bold mb-3 border border-slate-100 text-santi-blue" value={formData.initialPayment} onChange={e => setFormData({...formData, initialPayment: e.target.value})} />
                  <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
                    El resto de la deuda (${(Number(formData.amount || 0) - Number(formData.initialPayment || 0)).toFixed(2)}) se congelará de tu Saldo Libre para asegurar las cuotas futuras.
                  </p>
                </div>
              )}

              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg active:scale-95 transition-all shadow-xl">Registrar Transacción</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
