import React, { useState, useEffect } from 'react';
import { Layout, Calendar, MessageSquare, Settings, UserCheck, Inbox, Zap } from 'lucide-react';
import { BusinessInfo, Appointment, Customer, Service, SocialMessage } from './types';
import Dashboard from './components/Dashboard';
import ChatWidget from './components/ChatWidget';
import SettingsPanel from './components/SettingsPanel';
import AppointmentsList from './components/AppointmentsList';
import CustomerCRM from './components/CustomerCRM';
import SocialInbox from './components/SocialInbox';
import { calendarService } from './services/googleCalendar';
import { createAppointment, fetchAppointments, fetchBusiness, fetchCustomers, fetchSocialThreads, saveCustomer, updateBusiness, cancelAppointment as cancelAppointmentApi } from './services/dataApi';
import { clearAuth, getAuthProfile } from './services/auth';

const INITIAL_SERVICES: Service[] = [
  { id: 'm1', name: 'עיסוי שוודי קלאסי', description: 'עיסוי שחרור ודרמטי.', duration: 60, price: 280 },
  { id: 'm2', name: 'עיסוי רקמות עמוק', description: 'הקלה למתח שרירי וכאבי גב.', duration: 60, price: 320 },
  { id: 'm3', name: 'עיסוי אבנים חמות', description: 'חימום עמוק ודרימה שרירי.', duration: 75, price: 350 },
  { id: 'f1', name: 'טיפול פנים קלאסי', description: 'ניקוי, פילינג והזנה לעור הפנים.', duration: 60, price: 300 },
  { id: 'p1', name: 'חבילת VIP זוגית', description: 'חבילה זוגית הכוללת עיסוי, יין וקינוח ושרותי מלון.', duration: 120, price: 850 },
];
const DEFAULT_BUSINESS: BusinessInfo = {
  name: "ספא ביזנס פרו",
  ownerName: "ישראל ישראלי",
  category: "קוסמטיקה וטיפולי גוף",
  address: "הרצל 12, תל אביב",
  phone: "050-1234567",
  services: INITIAL_SERVICES,
  openingHours: "א'-ה': 09:00-20:00, ו': 09:00-14:00",
  isCalendarConnected: false,
  aiModel: 'gemini-flash-lite-latest',
  policies: "",
  calendarMode: "virtual",
  googleClientId: ""
};

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'chat' | 'appointments' | 'crm' | 'settings' | 'inbox'>('dashboard');

  const [business, setBusiness] = useState<BusinessInfo>(DEFAULT_BUSINESS);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [socialMessages, setSocialMessages] = useState<SocialMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const authProfile = getAuthProfile();

  useEffect(() => {
    const loadAll = async () => {
      try {
        setIsLoading(true);
        const [biz, apps, custs, socials] = await Promise.all([
          fetchBusiness(),
          fetchAppointments(),
          fetchCustomers(),
          fetchSocialThreads(),
        ]);
        setBusiness(biz);
        setAppointments(apps);
        setCustomers(custs);
        setSocialMessages(socials);
        setLoadError(null);
      } catch (err: any) {
        console.error(err);
        setLoadError('שגיאת טעינה. בדוק חיבור או הרשאות.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, []);

  useEffect(() => {
    if (business.googleClientId) {
      calendarService.setClientId(business.googleClientId);
    }
    if (business.calendarMode) {
      calendarService.setMode(business.calendarMode);
    }
  }, [business.googleClientId, business.calendarMode]);

  const refreshAll = async () => {
    const [apps, custs, socials] = await Promise.all([
      fetchAppointments(),
      fetchCustomers(),
      fetchSocialThreads(),
    ]);
    setAppointments(apps);
    setCustomers(custs);
    setSocialMessages(socials);
  };

  const handleCancelAppointment = async (idOrPhone: string) => {
    const byId = appointments.some(a => a.id === idOrPhone);
    await cancelAppointmentApi({
      id: byId ? idOrPhone : undefined,
      customerPhone: byId ? undefined : idOrPhone
    });
    setAppointments(prev =>
      prev.map(a => (a.id === idOrPhone || a.customerPhone === idOrPhone) ? { ...a, status: 'cancelled' as const } : a)
    );
  };

  const handleBookAppointment = async (appData: Omit<Appointment, 'id'>, source: 'ai' | 'manual' = 'ai') => {
    const bookedService = business.services.find(s => s.id === appData.serviceId);
    const servicePrice = bookedService?.price || 0;
    const created = await createAppointment({ ...appData, status: appData.status || 'confirmed' });
    setAppointments(prev => [created, ...prev]);

    const existing = customers.find(c => c.phone === appData.customerPhone);
    const updatedCustomer: Customer = existing
      ? {
          ...existing,
          name: appData.customerName || existing.name,
          lastVisit: new Date(),
          visitsCount: existing.visitsCount + 1,
          totalSpent: existing.totalSpent + servicePrice
        }
      : {
          id: Math.random().toString(36).substr(2, 9),
          name: appData.customerName,
          phone: appData.customerPhone,
          email: '',
          joinDate: new Date(),
          lastVisit: new Date(),
          visitsCount: 1,
          totalSpent: servicePrice,
          notes: 'נוצר אוטומטית',
          preferences: source === 'ai' ? ['נקבע ע"י ביזי'] : [],
          source: (source as any) || 'manual',
          marketingConsent: false
        };

    const saved = await saveCustomer(updatedCustomer);
    setCustomers(prev => {
      const idx = prev.findIndex(c => c.phone === saved.phone);
      if (idx === -1) return [...prev, saved];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });

    if (calendarService.getMode() === 'real' && calendarService.isConnected()) {
      await calendarService.createEvent({
        summary: `${bookedService?.name || 'תור'} - ${appData.customerName}`.trim(),
        description: `נוצר דרך Bizie AI.\nטלפון: ${appData.customerPhone}\nשירות: ${bookedService?.name}\nמחיר: ${servicePrice}₪`,
        start: appData.startTime.toISOString(),
        end: new Date(appData.startTime.getTime() + (bookedService?.duration || 60) * 60000).toISOString()
      });
    }
  };

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    const saved = await saveCustomer(updatedCustomer);
    setCustomers(prev => {
      const updated = prev.map(c => c.id === saved.id ? saved : c);
      return updated;
    });
  };

  const handleAddManualCustomer = async (newC: Omit<Customer, 'id'>) => {
    const customer: Customer = {
      ...newC,
      id: Math.random().toString(36).substr(2, 9)
    };
    const saved = await saveCustomer(customer);
    setCustomers(prev => [...prev, saved]);
  };

  const connectCalendar = () => {
    setBusiness(prev => ({ ...prev, isCalendarConnected: true, lastSyncTime: new Date() }));
  };

  const handleUpdateBusiness = async (info: BusinessInfo) => {
    const updated = await updateBusiness(info);
    setBusiness(updated);
  };

  const handleLogout = () => {
    clearAuth();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-bold">
        טוען נתונים...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-rose-600 font-bold">
        {loadError}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-assistant" dir="rtl">
      <nav className="w-full md:w-64 bg-indigo-950 text-white p-6 flex flex-col shadow-2xl z-20 shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-indigo-500 p-2.5 rounded-2xl shadow-lg animate-pulse">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter italic uppercase text-white">BIZIE</h1>
        </div>

        <div className="flex-1 space-y-2">
          <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Layout className="w-5 h-5" />} label="לוח בקרה" />
          <NavItem active={view === 'inbox'} onClick={() => setView('inbox')} icon={<Inbox className="w-5 h-5" />} label="תיבת Social" />
          <NavItem active={view === 'chat'} onClick={() => setView('chat')} icon={<MessageSquare className="w-5 h-5" />} label="ביזי (המסייעת)" />
          <NavItem active={view === 'appointments'} onClick={() => setView('appointments')} icon={<Calendar className="w-5 h-5" />} label="ניהול תורים" />
          <NavItem active={view === 'crm'} onClick={() => setView('crm')} icon={<UserCheck className="w-5 h-5" />} label="לקוחות" />
          <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon={<Settings className="w-5 h-5" />} label="הגדרות" />
        </div>

        <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-400 flex items-center justify-center text-indigo-950 font-black shrink-0 text-xl">
              {business.ownerName[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black truncate">{business.ownerName}</p>
              <p className="text-[10px] text-indigo-300 font-bold uppercase truncate tracking-wider">{business.name}</p>
            </div>
          </div>
          {authProfile && (
            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-[11px] font-bold text-indigo-100">
              <div className="truncate">מחובר כ‑{authProfile.label}</div>
              <div className="text-indigo-300 mt-1">
                {authProfile.type === 'google' ? 'Google' : 'Basic'}
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 w-full text-xs font-black text-white bg-rose-500/80 hover:bg-rose-500 py-2 rounded-xl transition-all"
              >
                התנתקות
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-auto p-4 md:p-10 bg-slate-50">
        {view === 'dashboard' && <Dashboard business={business} appointments={appointments} onConnectCalendar={connectCalendar} />}
        {view === 'inbox' && <SocialInbox messages={socialMessages} onUpdateMessages={setSocialMessages} onSyncData={refreshAll} />}
        {view === 'chat' && <ChatWidget business={business} onSyncData={refreshAll} />}
        {view === 'appointments' && <AppointmentsList appointments={appointments} services={business.services} onAddAppointment={(app) => handleBookAppointment(app, 'manual')} onCancelAppointment={handleCancelAppointment} />}
        {view === 'crm' && <CustomerCRM customers={customers} onAddCustomer={handleAddManualCustomer} onUpdateCustomer={handleUpdateCustomer} />}
        {view === 'settings' && <SettingsPanel business={business} onUpdate={handleUpdateBusiness} onConnectCalendar={connectCalendar} />}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${
      active ? 'bg-indigo-600 text-white shadow-xl translate-x-1' : 'text-indigo-200 hover:bg-white/5 hover:text-white'
    }`}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
    <span className="font-black text-sm">{label}</span>
  </button>
);

export default App;