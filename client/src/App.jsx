import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: '', category: 'Comida' });

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
    });
    return () => unsubscribe();
  }, []);

  const totalBalance = transactions.reduce((acc, curr) => acc + Number(curr.amount), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    await addDoc(collection(db, "transactions"), {
      ...formData,
      amount: Number(formData.amount),
      date: new Date().toISOString()
    });
    setFormData({ title: '', amount: '', category: 'Comida' });
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32">
      <div className="max-w-md mx-auto sticky top-0 z-40 px-6 pt-14 pb-4 backdrop-blur-md bg-[#F2F2F7]/80">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Total</p>
        <h1 className="text-4xl font-extrabold tracking-tight">\${totalBalance.toLocaleString()}</h1>
      </div>

      <main className="max-w-md mx-auto px-6 pt-4">
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-[2rem] flex justify-between items-center shadow-sm border border-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#F2F2F7] rounded-2xl flex items-center justify-center text-2xl">
                  {t.category === 'Comida' ? '🍷' : '💰'}
                </div>
                <div>
                  <h3 className="font-bold">{t.title}</h3>
                  <p className="text-xs text-slate-400">{t.category}</p>
                </div>
              </div>
              <span className={t.amount > 0 ? 'text-green-500 font-bold' : 'font-bold'}>
                \${t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </main>

      <button onClick={() => setShowModal(true)} className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-[#007AFF] text-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center text-3xl font-light z-50">
        +
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-[3rem] p-8 max-w-md mx-auto shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-center">Nuevo Gasto</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Concepto" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="number" placeholder="Monto" className="w-full bg-[#F2F2F7] p-4 rounded-2xl outline-none" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              <button type="submit" className="w-full bg-[#007AFF] text-white p-5 rounded-2xl font-black">Guardar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
