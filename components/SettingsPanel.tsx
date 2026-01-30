
import React, { useState, useEffect } from 'react';
import { BusinessInfo, Service } from '../types';
import { Save, Info, Calendar as CalendarIcon, Check, Loader2, Clock, MapPin, Phone, User, Globe, Database, List, Sparkles, Trash2, Edit2, Plus, X, Copy, CalendarDays, LayoutGrid, Settings2, AlertTriangle, ExternalLink, CheckCircle2, ShieldAlert, LifeBuoy, Wrench, ArrowRight, HelpCircle, Brain, Zap as ZapIcon, Mail } from 'lucide-react';
import { calendarService } from '../services/googleCalendar';

interface Props {
  business: BusinessInfo;
  onUpdate: (info: BusinessInfo) => void;
  onConnectCalendar: () => void;
}

interface DaySchedule {
  day: string;
  isOpen: boolean;
  start: string;
  end: string;
}

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DEFAULT_CLIENT_ID = "859360581054-8r4ujbe3prfv5n7cj4gt9buhadbskd7s.apps.googleusercontent.com";

const SettingsPanel: React.FC<Props> = ({ business, onUpdate, onConnectCalendar }) => {
  const [activeTab, setActiveTab] = useState<'business' | 'schedule' | 'ai'>('business');
  const [formData, setFormData] = useState<BusinessInfo>(business);
  const [clientId, setClientId] = useState(localStorage.getItem('bizie_google_client_id') || DEFAULT_CLIENT_ID);
  const [calendarMode, setCalendarMode] = useState<'virtual' | 'real'>(calendarService.getMode());
  const [isLinking, setIsLinking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOAuthHelp, setShowOAuthHelp] = useState(false);
  const [showTechFaq, setShowTechFaq] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(() => {
    return DAYS_OF_WEEK.map(day => ({
      day,
      isOpen: day !== 'שבת',
      start: '09:00',
      end: '19:00'
    }));
  });

  const toggleMode = (mode: 'virtual' | 'real') => {
    calendarService.setMode(mode);
    setCalendarMode(mode);
    setFormData(prev => ({ ...prev, isCalendarConnected: mode === 'real' }));
    if (mode === 'virtual') {
      calendarService.disconnect();
      setConnectedEmail(null);
      setConnectionSuccess(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    const scheduleString = weeklySchedule.filter(d => d.isOpen).map(d => `${d.day}: ${d.start}-${d.end}`).join(', ');
    const updatedData = { ...formData, openingHours: scheduleString };
    localStorage.setItem('bizie_services_v1', JSON.stringify(updatedData.services));
    setTimeout(() => {
      onUpdate(updatedData);
      setIsSaving(false);
      alert('השינויים נשמרו! ביזי מעודכנת ומחכה ללקוחות.');
    }, 800);
  };

  const handleLinkCalendar = async () => {
    if (calendarMode === 'virtual') {
      onConnectCalendar();
      return;
    }
    setIsLinking(true);
    setShowOAuthHelp(false);
    setConnectionSuccess(false);
    try {
      calendarService.setClientId(clientId);
      const { email } = await calendarService.login();
      setConnectedEmail(email || 'יומן מסונכרן');
      setConnectionSuccess(true);
      onConnectCalendar();
    } catch (err) {
      console.error("Auth Error:", err);
      setShowOAuthHelp(true);
    } finally {
      setIsLinking(false);
    }
  };

  const updateDay = (index: number, updates: Partial<DaySchedule>) => {
    const newSchedule = [...weeklySchedule];
    newSchedule[index] = { ...newSchedule[index], ...updates };
    setWeeklySchedule(newSchedule);
  };

  const copyFirstDayToAll = () => {
    const firstDay = weeklySchedule[0];
    const newSchedule = weeklySchedule.map(d => ({ ...d, isOpen: firstDay.isOpen, start: firstDay.start, end: firstDay.end }));
    setWeeklySchedule(newSchedule);
  };

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<Service | null>(null);

  const startEditService = (service: Service) => {
    setEditingServiceId(service.id);
    setServiceForm({ ...service });
  };

  const startAddService = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setEditingServiceId('new');
    setServiceForm({ id: newId, name: '', description: '', duration: 60, price: 0 });
  };

  const saveService = () => {
    if (!serviceForm || !serviceForm.name) return;
    const updatedServices = editingServiceId === 'new' ? [...formData.services, serviceForm] : formData.services.map(s => s.id === editingServiceId ? serviceForm : s);
    setFormData({ ...formData, services: updatedServices });
    setEditingServiceId(null);
    setServiceForm(null);
  };

  const deleteService = (id: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500 text-right">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Settings2 className="w-6 h-6" />
           </div>
           <div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">הגדרות המערכת</h2>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">ניהול ביזי והקליניקה שלך</p>
           </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTechFaq(!showTechFaq)} className="bg-slate-100 text-slate-600 px-4 py-3.5 rounded-2xl font-black hover:bg-slate-200 transition-all flex items-center gap-2 active:scale-95">
            <HelpCircle className="w-4 h-4" />
            למה Google Cloud?
          </button>
          <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            שמור שינויים
          </button>
        </div>
      </header>

      {showTechFaq && (
        <div className="bg-indigo-50 border-2 border-indigo-100 p-8 rounded-[2.5rem] animate-in slide-in-from-top-4 duration-300 space-y-4">
           <h3 className="text-lg font-black text-indigo-900 flex items-center gap-2">
             <HelpCircle className="w-5 h-5" /> הסבר קצר על התשתית (Cloud vs Firebase)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-bold text-slate-600 leading-relaxed">
             <div className="space-y-2">
               <p><b>למה לא Firebase?</b> פיירבייס מעולה למסדי נתונים, אבל יומן גוגל הוא שירות "קלאוד" טהור. כדי לתת למזכירה הרשאה לקרוא ולכתוב אירועים ביומן שלך, אנחנו חייבים להשתמש ב-Cloud Console כדי להגדיר Scopes של אבטחה.</p>
             </div>
             <div className="space-y-2">
               <p><b>האם זה אותו דבר?</b> כן! כל פרויקט ב-Cloud הוא גם פרויקט ב-Firebase. אנחנו פשוט משתמשים ב-"מרכז הבקרה" המתקדם יותר כדי לאפשר את הסנכרון עם Google Calendar.</p>
             </div>
           </div>
           <button onClick={() => setShowTechFaq(false)} className="text-indigo-600 text-xs font-black underline">הבנתי, בוא נמשיך</button>
        </div>
      )}

      <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100 gap-2">
         <button onClick={() => setActiveTab('business')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black transition-all ${activeTab === 'business' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
           <LayoutGrid className="w-4 h-4" /> פרטי עסק ושירותים
         </button>
         <button onClick={() => setActiveTab('schedule')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black transition-all ${activeTab === 'schedule' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
           <CalendarDays className="w-4 h-4" /> לו״ז וסנכרון יומן
         </button>
         <button onClick={() => setActiveTab('ai')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black transition-all ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
           <Brain className="w-4 h-4" /> הגדרות AI (ביזי)
         </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'business' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-500" /> מידע כללי על המותג
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 {[
                   { label: 'שם המותג', icon: Globe, key: 'name' },
                   { label: 'שם הבעלים', icon: User, key: 'ownerName' },
                   { label: 'כתובת', icon: MapPin, key: 'address' },
                   { label: 'טלפון', icon: Phone, key: 'phone' }
                 ].map(field => (
                   <div key={field.key} className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase mr-1">{field.label}</label>
                      <div className="relative">
                         <field.icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                         <input className="w-full pr-10 pl-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl font-bold outline-none text-sm transition-all text-right" value={(formData as any)[field.key]} onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} />
                      </div>
                   </div>
                 ))}
              </div>
            </section>

            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <List className="w-5 h-5 text-indigo-500" /> מחירון שירותים
                </h3>
                <button onClick={startAddService} className="text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                  <Plus className="w-4 h-4" /> הוסף שירות
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {formData.services.map(s => (
                  <div key={s.id} className="p-5 border-2 border-slate-50 rounded-2xl hover:border-indigo-100 transition-all group">
                     <div className="flex justify-between items-start mb-1">
                        <div className="font-black text-slate-800 text-sm">{s.name}</div>
                        <div className="flex gap-1">
                           <button onClick={() => startEditService(s)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                           <button onClick={() => deleteService(s.id)} className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                     </div>
                     <div className="text-indigo-600 font-black text-base">₪{s.price}</div>
                     <div className="text-[10px] font-black text-slate-300 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {s.duration} דקות
                     </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-300">
            <section className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" /> שעות פעילות שבועיות
                </h3>
                <button onClick={copyFirstDayToAll} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-all">
                  <Copy className="w-3.5 h-3.5" /> העתק יום א׳ לכולם
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {weeklySchedule.map((d, index) => (
                  <div key={d.day} className={`p-4 rounded-2xl border-2 transition-all ${d.isOpen ? 'bg-indigo-50/20 border-indigo-100' : 'bg-slate-50 border-transparent opacity-60'}`}>
                     <div className="flex items-center justify-between mb-3">
                        <span className="font-black text-slate-700">{d.day}</span>
                        <button onClick={() => updateDay(index, { isOpen: !d.isOpen })} className={`w-8 h-4 rounded-full relative transition-colors ${d.isOpen ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                           <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${d.isOpen ? 'left-4.5' : 'left-0.5'}`}></div>
                        </button>
                     </div>
                     {d.isOpen ? (
                       <div className="flex items-center gap-1.5">
                          <input type="time" className="flex-1 bg-white border border-indigo-100 rounded-lg px-2 py-1 text-[11px] font-black" value={d.start} onChange={e => updateDay(index, { start: e.target.value })} />
                          <span className="text-slate-300">-</span>
                          <input type="time" className="flex-1 bg-white border border-indigo-100 rounded-lg px-2 py-1 text-[11px] font-black" value={d.end} onChange={e => updateDay(index, { end: e.target.value })} />
                       </div>
                     ) : (
                       <div className="text-[10px] font-bold text-slate-400 text-center py-1">סגור</div>
                     )}
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl space-y-6">
               <h3 className="text-lg font-black flex items-center gap-2">
                 <Database className="w-5 h-5 text-indigo-400" /> סנכרון יומן גוגל
               </h3>
               <div className="space-y-3">
                  <button onClick={() => toggleMode('virtual')} className={`w-full p-4 rounded-2xl border-2 text-right flex items-center gap-3 transition-all ${calendarMode === 'virtual' ? 'bg-white text-indigo-900 border-white' : 'border-indigo-700 text-indigo-200'}`}>
                    <Database className="w-5 h-5" />
                    <div className="font-black text-xs">יומן פנימי (ללא גוגל)</div>
                  </button>
                  <button onClick={() => toggleMode('real')} className={`w-full p-4 rounded-2xl border-2 text-right flex items-center gap-3 transition-all ${calendarMode === 'real' ? 'bg-white text-indigo-900 border-white' : 'border-indigo-700 text-indigo-200'}`}>
                    <CalendarIcon className="w-5 h-5" />
                    <div className="font-black text-xs">סנכרון Google Calendar</div>
                  </button>
               </div>

               {calendarMode === 'real' && (
                 <div className="pt-2 space-y-4 animate-in fade-in">
                    <div className={`p-4 rounded-2xl border space-y-3 transition-all ${connectionSuccess ? 'bg-green-500/20 border-green-500' : 'bg-indigo-800/40 border-indigo-700'}`}>
                       <h4 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-2">
                          {connectionSuccess ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                          {connectionSuccess ? 'החיבור הצליח!' : "צ'קליסט סנכרון"}
                       </h4>
                       {connectionSuccess && connectedEmail && (
                         <div className="flex items-center gap-2 text-xs font-bold text-green-100 animate-in fade-in">
                            <Mail className="w-3.5 h-3.5" />
                            {connectedEmail}
                         </div>
                       )}
                       {!connectionSuccess && (
                         <ul className="space-y-2 text-[10px] font-bold text-indigo-100">
                            <li className="flex items-center gap-2 opacity-80"><Check className="w-3 h-3 text-green-400" /> הוספת את עצמך ב-Test Users</li>
                            <li className="flex items-center gap-2 opacity-80"><Check className="w-3 h-3 text-green-400" /> הגדרת Branding (שם ומייל)</li>
                         </ul>
                       )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-indigo-300 uppercase">Google Client ID</label>
                      <input 
                        className="w-full px-4 py-2 bg-indigo-800/50 border border-indigo-700 rounded-lg text-[10px] text-white outline-none focus:border-indigo-500 font-mono"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="הכנס כאן את ה-Client ID מה-Console"
                      />
                    </div>
                    
                    <button onClick={handleLinkCalendar} disabled={isLinking} className={`w-full py-3.5 rounded-xl font-black text-xs shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all ${connectionSuccess ? 'bg-green-600 hover:bg-green-500' : 'bg-indigo-500 hover:bg-indigo-400'}`}>
                      {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : connectionSuccess ? <CheckCircle2 className="w-4 h-4" /> : <CalendarIcon className="w-4 h-4" />}
                      {isLinking ? 'מתחבר ליומן...' : connectionSuccess ? 'מחובר בהצלחה' : 'לחץ לחיבור סופי'}
                    </button>

                    {showOAuthHelp && (
                      <div className="bg-rose-500/20 border-2 border-rose-500/30 p-5 rounded-[2rem] space-y-4 animate-in slide-in-from-top-2">
                         <div className="flex items-center gap-2 text-rose-200 font-black text-xs">
                            <ShieldAlert className="w-5 h-5" />
                            שגיאת הרשאות גוגל
                         </div>
                         <div className="text-[10px] text-indigo-100 font-bold leading-relaxed space-y-4">
                           <p className="bg-white/5 p-2 rounded-lg">כדי שהחיבור יצליח, עליך לבצע הגדרה אחת אחרונה ב-Google Console:</p>
                           
                           <div className="space-y-4">
                              <div className="flex gap-3 bg-indigo-800/30 p-3 rounded-xl border border-indigo-700">
                                 <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 font-black">1</div>
                                 <p>בלשונית <b>Credentials</b>, ערוך את ה-<b>OAuth 2.0 Client ID</b> שלך.</p>
                              </div>
                              <div className="flex gap-3 bg-indigo-800/30 p-3 rounded-xl border border-indigo-700">
                                 <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 font-black">2</div>
                                 <div>
                                   <p className="mb-2">הוסף ב-<b>"Authorized JavaScript origins"</b>:</p>
                                   <code className="bg-slate-900 px-2 py-1 rounded text-yellow-300 font-mono select-all">https://aistudio.google.com</code>
                                 </div>
                              </div>
                           </div>
                         </div>
                         <div className="pt-2">
                            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all w-full text-white no-underline">
                               <ExternalLink className="w-4 h-4" /> פתח Console להגדרות
                            </a>
                         </div>
                      </div>
                    )}
                 </div>
               )}
            </section>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
               <div className="flex items-center gap-4">
                  <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                     <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">ניהול מכסות ועוצמת AI</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase">שלוט במודל כדי למנוע שגיאות "Quota Exceeded"</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setFormData({ ...formData, aiModel: 'gemini-3-flash-preview' })}
                    className={`p-6 rounded-[2rem] border-2 transition-all text-right flex flex-col gap-3 group relative overflow-hidden ${formData.aiModel === 'gemini-3-flash-preview' || !formData.aiModel ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                  >
                    <div className="flex items-center justify-between">
                       <ZapIcon className={`w-6 h-6 ${formData.aiModel === 'gemini-3-flash-preview' || !formData.aiModel ? 'text-yellow-300' : 'text-slate-300'}`} />
                       <Check className={`w-5 h-5 ${formData.aiModel === 'gemini-3-flash-preview' || !formData.aiModel ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                    <div>
                       <div className="font-black text-base">ביצועים גבוהים (Flash)</div>
                       <p className={`text-[10px] font-bold mt-1 ${formData.aiModel === 'gemini-3-flash-preview' || !formData.aiModel ? 'text-indigo-100' : 'text-slate-400'}`}>מודל חכם וחד, מעולה למכירה מורכבת. רגיש יותר למכסות RPM בגרסה החינמית.</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setFormData({ ...formData, aiModel: 'gemini-flash-lite-latest' })}
                    className={`p-6 rounded-[2rem] border-2 transition-all text-right flex flex-col gap-3 group relative overflow-hidden ${formData.aiModel === 'gemini-flash-lite-latest' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                  >
                    <div className="flex items-center justify-between">
                       <LifeBuoy className={`w-6 h-6 ${formData.aiModel === 'gemini-flash-lite-latest' ? 'text-green-300' : 'text-slate-300'}`} />
                       <Check className={`w-5 h-5 ${formData.aiModel === 'gemini-flash-lite-latest' ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                    <div>
                       <div className="font-black text-base">חיסכון במכסה (Lite)</div>
                       <p className={`text-[10px] font-bold mt-1 ${formData.aiModel === 'gemini-flash-lite-latest' ? 'text-indigo-100' : 'text-slate-400'}`}>מודל "חסכוני" עם מגבלות RPM נדיבות יותר. מצוין למזכירה שצריכה לענות להרבה אנשים במקביל.</p>
                    </div>
                  </button>
               </div>

               <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-xs font-bold text-amber-800 leading-relaxed">
                    <p className="mb-2"><b>טיפ למקצוענים:</b> אם אתה משתמש ב-API החינמי של גוגל, נסה להשתמש ב-<b>Lite</b> בזמן שיא. אם חיברת אשראי ל-Google Cloud, תוכל להשתמש ב-<b>Flash</b> ללא חשש.</p>
                    <p>ביזי מתוכנתת לנקות את היסטוריית השיחה באופן אוטומטי (מעל 10 הודעות) כדי לחסוך בטוקנים ולשמור על מהירות תגובה מקסימלית.</p>
                  </div>
               </div>
            </section>
          </div>
        )}
      </div>

      {serviceForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setServiceForm(null)}></div>
           <div className="relative bg-white w-full max-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-indigo-900 p-6 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black">{editingServiceId === 'new' ? 'שירות חדש' : 'עריכת שירות'}</h3>
                 <button onClick={() => setServiceForm(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase">שם השירות</label>
                    <input className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl font-bold outline-none text-right" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase">מחיר (₪)</label>
                      <input type="number" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl font-bold outline-none text-right" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase">משך (דקות)</label>
                      <input type="number" className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl font-bold outline-none text-right" value={serviceForm.duration} onChange={e => setServiceForm({ ...serviceForm, duration: parseInt(e.target.value) || 0 })} />
                    </div>
                 </div>
                 <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase">תיאור קצר</label>
                    <textarea rows={2} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl font-bold outline-none resize-none text-right" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
                 </div>
                 <button onClick={saveService} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">שמור שירות</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;

