
import React, { useState, useMemo } from 'react';
import { Customer, MOCK_CUSTOMERS } from '../types';
import { User, Users, Check, Phone, Calendar, Star, Search, Filter, MessageSquare, Tag, Zap, MoreHorizontal, Send, Plus, X, Smartphone, FileText, Mail, CalendarDays, History, TrendingUp, Briefcase, Cake, Gift, Share2, Edit2, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  customers: Customer[];
  onAddCustomer: (c: Omit<Customer, 'id'>) => void;
  onUpdateCustomer: (c: Customer) => void;
}

const CustomerCRM: React.FC<Props> = ({ customers, onAddCustomer, onUpdateCustomer }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'vip' | 'new'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    notes: '',
    preferences: '',
    source: 'manual' as any,
    marketingConsent: true
  });

  const phoneValidation = useMemo(() => {
    const val = formData.phone;
    if (!val) return { status: 'empty', msg: '' };
    if (!val.startsWith('05')) return { status: 'error', msg: 'חובה 05' };
    if (val.length < 10) return { status: 'typing', msg: `חסר ${10 - val.length}` };
    if (val.length === 10) return { status: 'valid', msg: 'תקין' };
    return { status: 'error', msg: 'ארוך מדי' };
  }, [formData.phone]);

  const emailValidation = useMemo(() => {
    const val = formData.email;
    if (!val) return { status: 'empty', msg: '' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (val.includes('@')) {
       return emailRegex.test(val) ? { status: 'valid', msg: 'תקין' } : { status: 'error', msg: 'לא תקין' };
    }
    if (val.length > 4) return { status: 'typing', msg: 'חסר @' };
    return { status: 'typing', msg: '' };
  }, [formData.email]);

  const nameValidation = useMemo(() => {
    if (!formData.name) return { status: 'empty', msg: '' };
    return formData.name.length >= 2 ? { status: 'valid', msg: '' } : { status: 'error', msg: 'קצר' };
  }, [formData.name]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: val });
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.phone.includes(searchTerm) || 
                         c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'vip') return matchesSearch && c.totalSpent > 1000;
    if (activeTab === 'new') return matchesSearch && (new Date().getTime() - new Date(c.joinDate).getTime()) < (30 * 24 * 60 * 60 * 1000);
    return matchesSearch;
  });

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      birthday: customer.birthday || '',
      notes: customer.notes || '',
      preferences: customer.preferences.join(', '),
      source: customer.source,
      marketingConsent: customer.marketingConsent
    });
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', birthday: '', notes: '', preferences: '', source: 'manual', marketingConsent: true });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneValidation.status !== 'valid' || nameValidation.status !== 'valid') return;
    if (formData.email && emailValidation.status === 'error') return;

    const commonData = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      birthday: formData.birthday,
      notes: formData.notes,
      preferences: formData.preferences.split(',').map(p => p.trim()).filter(p => p !== ''),
      source: formData.source,
      marketingConsent: formData.marketingConsent
    };

    if (editingCustomer) {
      onUpdateCustomer({ ...editingCustomer, ...commonData });
    } else {
      onAddCustomer({ ...commonData, joinDate: new Date(), lastVisit: new Date(), visitsCount: 0, totalSpent: 0 });
    }
    setIsModalOpen(false);
  };

  const isFormValid = nameValidation.status === 'valid' && phoneValidation.status === 'valid' && (formData.email ? emailValidation.status === 'valid' : true);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-right">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">ניהול לקוחות חכם</h2>
          <p className="text-slate-500 font-bold mt-1">ביזי מנהלת את הקשר האישי, אתה מתרכז בטיפול.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              className="bg-white border-2 border-slate-100 pr-12 pl-6 py-3.5 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all w-full md:w-80" 
              placeholder="חפש לקוח..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={handleOpenAdd} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap">
             <Plus className="w-5 h-5" /> לקוח חדש
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">פרופיל</th>
                <th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">קשר</th>
                <th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">סטטיסטיקה</th>
                <th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">מקור</th>
                <th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest text-left">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? filteredCustomers.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black border-2 border-white shadow-sm shrink-0">{c.name[0]}</div>
                      <div>
                        <div className="font-black text-slate-900 text-base leading-tight flex items-center gap-2">
                           {c.name} {c.birthday && <Cake className="w-3 h-3 text-rose-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-1 tracking-tight">הצטרף ב-{new Date(c.joinDate).toLocaleDateString('he-IL')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                     <div className="space-y-1">
                        <div className="text-xs text-slate-600 font-bold flex items-center gap-2"><Smartphone className="w-3.5 h-3.5 text-indigo-400" /> {c.phone}</div>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-300" /> {c.email || 'אין אימייל'}</div>
                     </div>
                  </td>
                  <td className="p-6">
                     <div className="flex items-center gap-4">
                        <div className="text-center px-3 py-1 bg-slate-50 rounded-lg"><div className="text-xs font-black text-slate-700">{c.visitsCount}</div><div className="text-[8px] font-black text-slate-400 uppercase">ביקורים</div></div>
                        <div className="text-left font-black text-slate-900">₪{c.totalSpent.toLocaleString()}</div>
                     </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${c.source === 'ai' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{c.source === 'ai' ? 'ביזי AI' : 'ידני'}</span>
                  </td>
                  <td className="p-6 text-left">
                    <button onClick={() => handleOpenEdit(c)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-black italic">לא נמצאו לקוחות.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              <div className="bg-indigo-900 p-6 text-white flex justify-between items-center shrink-0">
                 <h3 className="text-xl font-black">{editingCustomer ? `עריכת לקוח: ${editingCustomer.name}` : 'כרטיס לקוח חדש'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 text-right">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">שם מלא *</label>
                       <div className="relative">
                          <User className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${nameValidation.status === 'error' ? 'text-red-500' : 'text-slate-300'}`} />
                          <input required className={`w-full pr-12 pl-36 py-3.5 bg-slate-50 border-2 rounded-2xl font-bold outline-none transition-all ${nameValidation.status === 'error' ? 'border-red-300 text-red-600 bg-red-50' : 'border-transparent focus:border-indigo-600'}`} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                          {nameValidation.status === 'error' && (
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black bg-red-100 text-red-600 px-2 py-1 rounded-lg shadow-sm">
                                {nameValidation.msg}
                             </div>
                          )}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">טלפון נייד (חייב 05) *</label>
                       <div className="relative">
                          <Smartphone className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all ${phoneValidation.status === 'error' ? 'text-red-500 scale-110' : phoneValidation.status === 'valid' ? 'text-green-600' : 'text-slate-300'}`} />
                          <input required type="tel" className={`w-full pr-12 pl-36 py-3.5 bg-slate-50 border-2 rounded-2xl font-bold outline-none transition-all ${phoneValidation.status === 'error' ? 'border-red-400 text-red-600 bg-red-50/50' : phoneValidation.status === 'valid' ? 'border-green-200 bg-green-50/20' : 'border-transparent focus:border-indigo-600'}`} value={formData.phone} onChange={handlePhoneChange} />
                          {phoneValidation.status !== 'empty' && (
                            <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-sm ${phoneValidation.status === 'error' ? 'bg-red-100 text-red-600' : phoneValidation.status === 'valid' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                               {phoneValidation.msg}
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">אימייל (חכמה בזמן אמת)</label>
                       <div className="relative">
                          <Mail className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all ${emailValidation.status === 'error' ? 'text-red-500 scale-110' : emailValidation.status === 'valid' ? 'text-green-600' : 'text-slate-300'}`} />
                          <input type="email" placeholder="example@gmail.com" className={`w-full pr-12 pl-36 py-3.5 bg-slate-50 border-2 rounded-2xl font-bold outline-none transition-all ${emailValidation.status === 'error' ? 'border-red-400 text-red-600 bg-red-50/50' : emailValidation.status === 'valid' ? 'border-green-200 bg-green-50/20' : 'border-transparent focus:border-indigo-600'}`} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                          {emailValidation.status !== 'empty' && emailValidation.msg && (
                            <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-sm ${emailValidation.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                               {emailValidation.msg}
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">תאריך יום הולדת</label>
                       <input type="date" className="w-full pr-4 pl-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold outline-none" value={formData.birthday} onChange={e => setFormData({ ...formData, birthday: e.target.value })} />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">הערות פנימיות לתיק הלקוח</label>
                    <textarea rows={3} className="w-full pr-4 pl-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold outline-none resize-none" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                 </div>

                 <button type="submit" disabled={!isFormValid} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-40 disabled:cursor-not-allowed">
                   {editingCustomer ? <ShieldCheck className="w-6 h-6" /> : <Check className="w-6 h-6" />}
                   {editingCustomer ? 'עדכן כרטיס לקוח' : 'שמור לקוח במערכת'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCRM;
