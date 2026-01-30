
import { Send, Bot, Maximize2, Minimize2, Loader2, UserPlus, Activity, ShieldCheck } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { BusinessInfo, Appointment, ChatMessage } from '../types';
import { gemini } from '../services/gemini';
import { calendarService } from '../services/googleCalendar';

interface Props {
  business: BusinessInfo;
  appointments: Appointment[];
  onBook: (app: Omit<Appointment, 'id'>) => void;
  onCancel: (id: string) => void;
}

const ChatWidget: React.FC<Props> = ({ business, appointments, onBook, onCancel }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `היי! אני ביזי ✨ איך אפשר לעזור היום?`, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ text: string, type: 'search' | 'crm' } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<any[]>([]);

  useEffect(() => {
    if (chatHistoryRef.current.length === 0) {
      chatHistoryRef.current.push({ role: 'model', parts: [{ text: messages[0].text }] });
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, actionStatus]);

  const handleSend = async (text?: string) => {
    const textToSend = text || input;
    if (!textToSend.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', text: textToSend, timestamp: new Date() }]);
    setInput('');
    setIsLoading(true);
    chatHistoryRef.current.push({ role: 'user', parts: [{ text: textToSend }] });

    try {
      // Intent detection for actions
      const isAction = /קבע|תור|פנוי|מתי|שריין|סגור|כן|בואי/.test(textToSend) || /\d{8,}/.test(textToSend);
      
      if (isAction) {
        setActionStatus({ text: "בודקת ביומן...", type: 'search' });
        const response = await gemini.sendMessage(chatHistoryRef.current, business);
        
        if (response.functionCalls && response.functionCalls.length > 0) {
          const toolResultsParts: any[] = [];
          chatHistoryRef.current.push(response.candidates[0].content);
          
          for (const fc of response.functionCalls) {
            let result: any = { status: "ok" };
            if (fc.name === 'check_availability') {
              const res = await calendarService.checkAvailability((fc.args as any).dateTime, 60);
              result = { available: res };
            } else if (fc.name === 'book_appointment') {
              setActionStatus({ text: "מעדכנת CRM וקובעת תור...", type: 'crm' });
              onBook({ 
                customerName: (fc.args as any).customerName, 
                customerPhone: (fc.args as any).customerPhone, 
                serviceId: (fc.args as any).serviceId, 
                startTime: new Date((fc.args as any).startTime), 
                status: 'confirmed' 
              });
              result = { success: true, status: "booked" };
            }
            toolResultsParts.push({ functionResponse: { id: fc.id, name: fc.name, response: { result } } });
          }
          chatHistoryRef.current.push({ role: 'user', parts: toolResultsParts });
        }
      }

      setIsLoading(false);
      setActionStatus(null);
      const botMessageId = Date.now();
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: new Date(), id: botMessageId } as any]);
      
      let fullText = "";
      const stream = gemini.sendMessageStream(chatHistoryRef.current, business);
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => prev.map(m => (m as any).id === botMessageId ? { ...m, text: fullText } : m));
      }
      chatHistoryRef.current.push({ role: 'model', parts: [{ text: fullText }] });
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: "סליחה, אני זמינה שוב בעוד רגע... 😊", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
      setActionStatus(null);
    }
  };

  return (
    <div className={`flex flex-col bg-white shadow-2xl transition-all duration-300 text-right ${isFullScreen ? 'fixed inset-0 z-[100]' : 'max-w-6xl mx-auto h-[calc(100vh-6rem)] rounded-[3rem] overflow-hidden border border-slate-100'}`}>
      <div className="bg-indigo-950 text-white p-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="font-black text-xl leading-none">ביזי</h3>
            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1">מערכת תסריטים אוטומטית</p>
          </div>
        </div>
        <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
          {isFullScreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-50/20" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in`}>
            <div className={`max-w-[85%] p-5 rounded-[2rem] text-[16px] font-medium whitespace-pre-wrap leading-relaxed shadow-sm border ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-200' : 'bg-white text-slate-700 border-slate-100'}`}>
              {msg.text || "..."}
            </div>
          </div>
        ))}
        {actionStatus && (
          <div className="flex justify-start">
             <div className={`px-5 py-3 rounded-2xl text-[11px] font-black flex items-center gap-3 border animate-pulse shadow-sm ${
               actionStatus.type === 'crm' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
             }`}>
                {actionStatus.type === 'crm' ? <UserPlus className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                {actionStatus.text}
             </div>
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0">
        <div className="flex flex-wrap gap-2 mb-6 justify-end">
           {["אני רוצה לקבוע", "מה המחירון?", "כואב לי הגב"].map((s, idx) => (
             <button key={idx} onClick={() => handleSend(s)} disabled={isLoading} className="border-2 px-5 py-2.5 rounded-2xl text-[11px] font-black border-slate-100 text-slate-400 hover:border-indigo-600 hover:text-indigo-600 transition-all active:scale-95">
               {s}
             </button>
           ))}
        </div>
        <div className="max-w-4xl mx-auto flex items-center gap-4">
            <input className="flex-1 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[1.5rem] px-8 py-5 outline-none font-bold text-right text-lg transition-all" placeholder="היי ביזי..." value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} disabled={isLoading} />
            <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="p-5 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl hover:bg-indigo-700 disabled:opacity-30 transition-all active:scale-90">
              {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Send className="w-7 h-7" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
