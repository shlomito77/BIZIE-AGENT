// Add missing React import
import React from 'react';
import { BusinessInfo, Appointment } from '../types';
import { Users, Calendar, TrendingUp, CheckCircle, Clock, Zap, Lightbulb, ArrowUpRight, Target, BrainCircuit, FileText, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { calendarService } from '../services/googleCalendar';

interface Props {
  business: BusinessInfo;
  appointments: Appointment[];
  onConnectCalendar: () => void;
}

const Dashboard: React.FC<Props> = ({ business, appointments, onConnectCalendar }) => {
  // Use React.useState correctly with the imported React object
  const [connectionStatus, setConnectionStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');

  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const today = new Date().toDateString();
  const todayCount = appointments.filter(a => a.startTime.toDateString() === today).length;

  const handleConnect = async () => {
    setConnectionStatus('loading');
    setErrorMessage('');
    try {
      await calendarService.login();
      setConnectionStatus('success');
      onConnectCalendar();
    } catch (err: any) {
      console.error(err);
      setConnectionStatus('error');
      setErrorMessage(typeof err === 'string' ? err : 'שגיאת חיבור ליומן. בדוק את Client ID בהגדרות.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">שלום, {business.ownerName}</h2>
          <div className="flex items-center gap-3">
             <p className="text-slate-500 font-bold">ביזי המזכירה פעילה ומוכנה לעבודה.</p>
             {(business.isCalendarConnected || calendarService.isConnected()) && (
               <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[11px] font-black border border-green-100">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  מסונכרן עם Google Calendar
               </div>
             )}
          </div>
        </div>
        <div className="flex gap-3">
           <div className="bg-white border border-slate-200 px-5 py-3 rounded-[1.5rem] shadow-sm flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-black text-slate-700 tracking-tight">ביזי אונליין (v2.5)</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <BrainCircuit className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-400/30 p-2.5 rounded-xl border border-white/20">
                  <Lightbulb className="w-6 h-6 text-yellow-300" />
                </div>
                <h4 className="font-black text-xl tracking-tight">תובנת AI לבוקר זה:</h4>
              </div>
              <p className="text-indigo-100 text-lg font-medium leading-relaxed max-w-2xl mb-8">
                {business.isCalendarConnected || calendarService.isConnected()
                  ? `"המערכת מסונכרנת. סרקתי את היומן שלך בגוגל. ראיתי שיש לך פער ביום חמישי בצהריים. שלחתי הצעה ללקוח שביקש תור - הוא כבר אישר והתור בפנים!"`
                  : `"ביזי כרגע עובדת במצב לא מקוון. אם תחבר את Google Calendar, אוכל לזהות חורים בלו״ז ולמלא אותם בלקוחות באופן אקטיבי ולחסוך לך המון זמן."`}
              </p>
              
              {!(business.isCalendarConnected || calendarService.isConnected()) ? (
                <div className="space-y-4">
                  <button 
                    onClick={handleConnect}
                    disabled={connectionStatus === 'loading'}
                    className={`px-8 py-4 rounded-2xl font-black shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70 ${
                      connectionStatus === 'error' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-white text-indigo-900 hover:bg-indigo-50'
                    }`}
                  >
                     {connectionStatus === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                     {connectionStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                     {connectionStatus === 'loading' ? 'מתחבר ליומן...' : 
                      connectionStatus === 'success' ? 'מחובר בהצלחה!' : 
                      connectionStatus === 'error' ? 'נסה שנית' : 'חבר יומן גוגל עכשיו'}
                  </button>
                  {connectionStatus === 'error' && (
                    <div className="bg-rose-500/20 text-rose-100 p-3 rounded-xl border border-rose-500/30 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                       <AlertCircle className="w-4 h-4 shrink-0" />
                       {errorMessage}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-green-500/20 text-green-100 px-6 py-3 rounded-2xl border border-green-500/30 font-black text-sm">
                   <CheckCircle2 className="w-5 h-5" />
                   הסנכרון פעיל ותקין
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-black text-slate-800 text-xl">פעולות אחרונות שביזי ביצעה</h4>
            </div>
            <div className="space-y-4">
              {business.isCalendarConnected || calendarService.isConnected() ? (
                <>
                  <div className="flex gap-4 items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-slate-600 font-medium">סנכרון מלא הושלם מול Google Calendar.</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                    <p className="text-slate-600 font-medium">המערכת בדקה זמינות ל-3 לקוחות חדשים הבוקר.</p>
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 p-6 rounded-2xl text-center border-2 border-dashed border-slate-200">
                   <p className="text-slate-500 font-bold italic">חבר יומן כדי לראות פעולות סנכרון בזמן אמת</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm h-full flex flex-col">
             <div className="flex items-center justify-between mb-8">
                <h4 className="font-black text-slate-800 text-lg">יעד הכנסה חודשי</h4>
                <Target className="w-6 h-6 text-indigo-500" />
             </div>
             <div className="flex-1 flex flex-col justify-center text-center">
                <div className="text-5xl font-black text-slate-900 mb-2">₪{(confirmedCount * 280).toLocaleString()}</div>
                <p className="text-slate-500 text-sm font-bold">מתוך יעד של ₪20,000</p>
                <div className="mt-8 h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full bg-indigo-600 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${Math.min((confirmedCount * 280 / 20000) * 100, 100)}%` }}></div>
                </div>
             </div>
             <div className="mt-auto pt-8 flex gap-4">
                <div className="flex-1 bg-green-50 p-4 rounded-2xl text-center">
                   <div className="text-green-700 font-black text-xl">84%</div>
                   <div className="text-[10px] text-green-600 font-black uppercase">לקוחות חוזרים</div>
                </div>
                <div className="flex-1 bg-blue-50 p-4 rounded-2xl text-center">
                   <div className="text-blue-700 font-black text-xl">4.9</div>
                   <div className="text-[10px] text-blue-600 font-black uppercase">ציון AI</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
        <StatCard title="תורים להיום" value={todayCount.toString()} icon={<Calendar className="text-indigo-600" />} color="bg-indigo-50" change="+4" />
        <StatCard title="זמן מענה" value="0.4s" icon={<Zap className="text-yellow-600" />} color="bg-yellow-50" change="מיידי" />
        <StatCard title="לידים חדשים" value="12" icon={<Users className="text-purple-600" />} color="bg-purple-50" change="השבוע" />
        <StatCard title="חיסכון בזמן" value="12ש׳" icon={<Clock className="text-blue-600" />} color="bg-blue-50" change="השבוע" />
      </div>
    </div>
  );
};

// Use React.FC and React.ReactNode with the correctly imported React
const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; change: string }> = ({ title, value, icon, color, change }) => (
  <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:scale-[1.02] transition-all">
    <div className={`w-14 h-14 rounded-[1.5rem] ${color} flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform`}>
      {icon}
    </div>
    <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2">{title}</p>
    <div className="flex items-baseline gap-2">
       <span className="text-3xl font-black text-slate-900 tracking-tight">{value}</span>
       <span className="text-[10px] font-black text-green-600">{change}</span>
    </div>
  </div>
);

export default Dashboard;