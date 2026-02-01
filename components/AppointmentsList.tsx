
import React, { useState, useMemo } from 'react';
import { Appointment, Service } from '../types';
import { Calendar as CalendarIcon, Clock, Phone, User, CheckCircle2, XCircle, Plus, X, Search, Check, Info, AlertCircle, Smartphone } from 'lucide-react';

interface Props {
  appointments: Appointment[];
  services: Service[];
  onAddAppointment: (app: Omit<Appointment, 'id'>) => void;
  onCancelAppointment: (id: string) => void;
}

const AppointmentsList: React.FC<Props> = ({ appointments, services, onAddAppointment, onCancelAppointment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00'
  });

  const filteredServices = useMemo(() => {
    return services.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [services, searchTerm]);

  const selectedService = useMemo(() => {
    return services.find(s => s.id === formData.serviceId);
  }, [services, formData.serviceId]);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }, [appointments]);

  // לוגיקת ולידציה בזמן אמת - אדום מיידי אם לא תקין
  const phoneValidation = useMemo(() => {
    const val = formData.customerPhone;
    if (!val) return { status: 'empty', msg: '' };
    if (!val.startsWith('05')) return { status: 'error', msg: 'חובה 05' };
    if (val.length < 10) return { status: 'typing', msg: `חסר ${10 - val.length}` };
    if (val.length === 10) return { status: 'valid', msg: 'תקין' };
    return { status: 'error', msg: 'ארוך מדי' };
  }, [formData.customerPhone]);

  const nameValidation = useMemo(() => {
    if (!formData.customerName) return { status: 'empty', msg: '' };
    if (formData.customerName.length < 2) return { status: 'error', msg: 'קצר מדי' };
    return { status: 'valid', msg: '' };
  }, [formData.customerName]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, customerPhone: val });
  };

  const isFormValid = nameValidation.status === 'valid' && phoneValidation.status === 'valid' && formData.serviceId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const startTime = new Date(`${formData.date}T${formData.time}`);
    onAddAppointment({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      serviceId: formData.serviceId,
      startTime,
      status: 'confirmed'
    });

    setIsModalOpen(false);
    setFormData({
      customerName: '',
      customerPhone: '',
      serviceId: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00'
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">ניהול תורים</h2>
          <p className="text-slate-500 font-bold">צפייה וניהול כל הלו״ז של העסק במקום אחד.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          הוסף תור ידנית
        </button>
      </header>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            
            <div className="bg-indigo-900 p-8 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black tracking-tight">הוספת תור ידני ליומן</h3>
                <p className="text-indigo-300 font-bold text-sm">הזנת פרטים מהירה עם ולידציה חכמה.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-12 text-right">
                <div className="flex-1 space-y-8">
                  <div className="space-y-6">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2 justify-end">
                       פרטי לקוח ומועד <User className="w-3 h-3" />
                     </h4>
                     
                     <div className="space-y-6">
                        <div className="space-y-1.5">
                          <div className="relative">
                            <User className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${nameValidation.status === 'error' ? 'text-red-500' : 'text-slate-400'}`} />
                            <input 
                              required
                              placeholder="שם לקוח מלא"
                              className={`w-full pr-12 pl-36 py-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none transition-all text-right ${
                                nameValidation.status === 'error' ? 'border-red-400 text-red-600 bg-red-50/50' : 'border-transparent focus:border-indigo-600'
                              }`}
                              value={formData.customerName}
                              onChange={e => setFormData({...formData, customerName: e.target.value})}
                            />
                            {nameValidation.status === 'error' && (
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black bg-red-100 text-red-600 px-2 py-1 rounded-lg shadow-sm">
                                {nameValidation.msg}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="relative">
                            <Smartphone className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all ${
                              phoneValidation.status === 'error' ? 'text-red-500 scale-110' : 
                              phoneValidation.status === 'valid' ? 'text-green-600' : 'text-slate-400'
                            }`} />
                            <input 
                              required
                              type="tel"
                              placeholder="טלפון נייד (חובה 05)"
                              className={`w-full pr-12 pl-36 py-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none transition-all text-right ${
                                phoneValidation.status === 'error' ? 'border-red-400 text-red-600 bg-red-50/50' : 
                                phoneValidation.status === 'valid' ? 'border-green-200 bg-green-50/20' : 'border-transparent focus:border-indigo-600'
                              }`}
                              value={formData.customerPhone}
                              onChange={handlePhoneChange}
                            />
                            {phoneValidation.status !== 'empty' && (
                              <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-sm ${
                                phoneValidation.status === 'error' ? 'bg-red-100 text-red-600' : 
                                phoneValidation.status === 'valid' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'
                              }`}>
                                {phoneValidation.msg}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative">
                            <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                            <input required type="date" className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold outline-none text-right" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                          </div>
                          <div className="relative">
                            <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                            <input required type="time" className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold outline-none text-right" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                          </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-indigo-50 p-6 rounded-[2rem] border-2 border-indigo-100/50 space-y-4">
                     <h4 className="font-black text-indigo-900 text-lg flex items-center gap-2 justify-end">
                       סיכום הזמנה <Info className="w-5 h-5" />
                     </h4>
                     {selectedService ? (
                       <div className="space-y-2">
                          <div className="flex justify-between font-black text-slate-700">
                             <span className="text-indigo-600">{selectedService.name}</span>
                             <span>שירות:</span>
                          </div>
                          <div className="flex justify-between font-bold text-slate-500 text-sm">
                             <span>₪{selectedService.price}</span>
                             <span>מחיר:</span>
                          </div>
                       </div>
                     ) : (
                       <p className="text-sm font-bold text-indigo-400 italic">יש לבחור שירות מהרשימה...</p>
                     )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col space-y-4">
                  <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="חפש שירות במחירון..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pr-12 pl-4 py-3 text-sm font-bold focus:border-indigo-600 outline-none transition-all text-right"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-2 custom-scrollbar">
                    {filteredServices.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setFormData({...formData, serviceId: s.id})}
                        className={`w-full p-5 rounded-2xl border-2 text-right transition-all flex justify-between items-center group ${
                          formData.serviceId === s.id 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl translate-x-1' 
                            : 'bg-white border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/20 text-slate-700'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-black text-base">{s.name}</div>
                          <div className={`text-[11px] font-black mt-3 flex gap-3 justify-end ${formData.serviceId === s.id ? 'text-white' : 'text-indigo-600'}`}>
                            <span className="font-black">₪{s.price}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration} דק׳</span>
                          </div>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ml-4 ${
                          formData.serviceId === s.id ? 'bg-white text-indigo-600 border-white' : 'bg-slate-50 border-slate-100 text-transparent'
                        }`}>
                           <Check className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-2xl font-black shadow-sm hover:bg-slate-50 transition-all">ביטול</button>
                <button 
                  type="submit"
                  disabled={!isFormValid}
                  className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-40 text-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CalendarIcon className="w-5 h-5" />
                  קבע תור ביומן
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden text-right">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b">
                <th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">זמן</th>
                <th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">לקוח</th>
                <th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">שירות</th>
                <th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">סטטוס</th>
                <th className="p-6 font-black text-slate-400 text-[10px] uppercase tracking-widest text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedAppointments.length > 0 ? (
                sortedAppointments.map((app) => {
                  const service = services.find(s => s.id === app.serviceId);
                  const statusLabel = app.status === 'cancelled' ? 'מבוטל' : app.status === 'pending' ? 'ממתין' : 'מאושר';
                  const statusClass = app.status === 'cancelled'
                    ? 'bg-rose-50 text-rose-700 border-rose-100'
                    : app.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-green-50 text-green-700 border-green-100';
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-4 justify-end">
                          <div className="text-right">
                            <div className="font-black text-slate-900 leading-tight">
                              {app.startTime.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                            </div>
                            <div className="text-xs text-slate-400 font-bold mt-1">
                              {app.startTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <CalendarIcon className="w-5 h-5" />
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="font-black text-slate-900 leading-tight">{app.customerName}</div>
                        <div className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-1.5 justify-end">
                           {app.customerPhone} <Phone className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="font-black text-sm text-indigo-700">{service?.name || 'שירות כללי'}</div>
                        <div className="text-[10px] text-slate-400 font-black mt-0.5 tracking-tight">₪{service?.price || 0} | {service?.duration || 60} דק׳</div>
                      </td>
                      <td className="p-6 text-center">
                         <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black border shadow-sm ${statusClass}`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {statusLabel}
                          </div>
                      </td>
                      <td className="p-6 text-left">
                        <button onClick={() => onCancelAppointment(app.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><XCircle className="w-6 h-6" /></button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-40 text-center text-slate-400 font-black text-xl italic">אין עדיין תורים רשומים.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsList;
