
import React, { useState, useRef, useEffect } from 'react';
import { SocialMessage } from '../types';
import { Instagram, Facebook, MessageCircle, Send, Loader2, Clock, ArrowRight, Activity } from 'lucide-react';
import { sendSocialMessage } from '../services/dataApi';

interface Props {
  messages: SocialMessage[];
  onUpdateMessages: (msgs: SocialMessage[]) => void;
  onSyncData?: () => void;
}

const SocialInbox: React.FC<Props> = ({ messages, onUpdateMessages, onSyncData }) => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unprocessed'>('unprocessed');
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChat = messages.find(m => m.id === activeChatId);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeChat, isLoading]);

  const handleSend = async (text?: string) => {
    if (!activeChatId || (!input.trim() && !text) || isLoading) return;
    const textToSend = text || input;
    
    // Update local state first (User message)
    const updatedMessages = [...messages];
    const chatIndex = updatedMessages.findIndex(m => m.id === activeChatId);
    if (chatIndex === -1) return;
    updatedMessages[chatIndex] = {
      ...updatedMessages[chatIndex],
      chatHistory: [...updatedMessages[chatIndex].chatHistory, { role: 'user', text: textToSend, timestamp: new Date() }]
    };
    onUpdateMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      setActionStatus("מייצרת תשובה...");
      const result = await sendSocialMessage({
        threadId: activeChatId,
        message: textToSend,
      });

      const latestMsgs = [...updatedMessages];
      const idx = latestMsgs.findIndex(m => m.id === result.thread.id);
      if (idx !== -1) {
        latestMsgs[idx] = result.thread;
      }
      onUpdateMessages(latestMsgs);

      if (result.actions?.length && onSyncData) {
        onSyncData();
      }

    } catch (e: any) {
      console.error(e);
      const errorStr = JSON.stringify(e);
      const isQuota = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || e?.message?.includes('quota');
      
      setActionStatus(isQuota ? "עומס במערכת ה-AI..." : "שגיאת תקשורת...");
      
      const errorText = isQuota 
        ? "מצטערת, אני קצת עמוסה כרגע. נסה שוב בעוד דקה? 🙏" 
        : "אופס, משהו השתבש בחיבור. נסה שוב?";
        
      const latestMsgs = [...updatedMessages];
      latestMsgs[chatIndex].chatHistory.push({ role: 'model', text: errorText, timestamp: new Date() });
      onUpdateMessages(latestMsgs);
    } finally {
      setIsLoading(false);
      setActionStatus(null);
    }
  };

  const getPlatformStyle = (platform: string) => {
    switch(platform) {
      case 'instagram': return { icon: <Instagram className="w-5 h-5" />, color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600', text: 'text-pink-600' };
      case 'facebook': return { icon: <Facebook className="w-5 h-5" />, color: 'bg-blue-600', text: 'text-blue-600' };
      case 'tiktok': return { icon: <div className="font-black text-[10px]">T</div>, color: 'bg-black', text: 'text-slate-900' };
      case 'whatsapp': return { icon: <MessageCircle className="w-5 h-5" />, color: 'bg-green-500', text: 'text-green-600' };
      case 'telegram': return { icon: <Send className="w-5 h-5" />, color: 'bg-sky-500', text: 'text-sky-600' };
      default: return { icon: <MessageCircle className="w-5 h-5" />, color: 'bg-slate-500', text: 'text-slate-500' };
    }
  };

  if (activeChat) {
    const style = getPlatformStyle(activeChat.platform);
    return (
      <div className="h-[calc(100vh-8rem)] bg-white rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-300 text-right border border-slate-100">
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
              <button onClick={() => setActiveChatId(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ArrowRight className="w-6 h-6" /></button>
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500 overflow-hidden border-2 border-white/20">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeChat.senderName}`} alt="avatar" />
                </div>
                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white shadow-md ${style.color}`}>
                   {style.icon}
                </div>
              </div>
              <div>
                 <h3 className="font-black text-lg">{activeChat.senderName}</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ערוץ: {activeChat.platform}</p>
              </div>
           </div>
           <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black border border-indigo-500/20">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              ביזי מחוברת
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/20 custom-scrollbar" ref={scrollRef}>
           {activeChat.chatHistory.map((msg, i) => (
             <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in`}>
                <div className={`max-w-[75%] p-5 rounded-3xl text-[15px] font-bold shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'}`}>
                   {msg.text || "..."}
                </div>
                <span className="text-[9px] font-black text-slate-300 mt-1 uppercase mr-2 ml-2">
                   {msg.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </span>
             </div>
           ))}
           {actionStatus && (
             <div className="flex justify-start">
                <div className="bg-indigo-50 text-indigo-600 px-5 py-3 rounded-2xl text-[11px] font-black flex items-center gap-3 border border-indigo-100 animate-pulse shadow-sm">
                   <Activity className="w-4 h-4" /> {actionStatus}
                </div>
             </div>
           )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
           <div className="flex gap-2 mb-4 justify-end flex-wrap">
              {["מחירון שירותים", "תיאום תור חדש", "ביטול תור קיים", "מיקום העסק"].map(s => (
                <button key={s} onClick={() => handleSend(s)} disabled={isLoading} className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100">
                  {s}
                </button>
              ))}
           </div>
           <div className="max-w-4xl mx-auto flex gap-4">
              <input 
                className="flex-1 bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-4 outline-none font-bold text-right text-lg focus:bg-white focus:border-indigo-600 transition-all shadow-inner" 
                placeholder={`השב ל${activeChat.senderName}...`} 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="p-5 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl hover:bg-indigo-700 disabled:opacity-30 active:scale-95 transition-all">
                 {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Send className="w-7 h-7" />}
              </button>
           </div>
        </div>
      </div>
    );
  }

  const unprocessedCount = messages.filter(m => !m.isProcessed).length;
  const filteredMessages = messages.filter(m => activeFilter === 'all' ? true : !m.isProcessed);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">מרכז הודעות Omni-Channel</h2>
          <p className="text-slate-500 font-bold mt-1">ביזי מנהלת את וואטסאפ, אינסטגרם, פייסבוק וטיקטוק באותו אופן בדיוק.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
           <button onClick={() => setActiveFilter('unprocessed')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeFilter === 'unprocessed' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>ממתינים לטיפול ({unprocessedCount})</button>
           <button onClick={() => setActiveFilter('all')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>כל ההודעות</button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((msg) => {
            const style = getPlatformStyle(msg.platform);
            const lastMsg = msg.chatHistory[msg.chatHistory.length - 1];
            return (
              <div key={msg.id} onClick={() => setActiveChatId(msg.id)} className={`bg-white p-7 rounded-[2.5rem] shadow-sm border-2 transition-all hover:border-indigo-200 cursor-pointer group relative overflow-hidden ${msg.isProcessed ? 'border-slate-50' : 'border-indigo-100 bg-indigo-50/5'}`}>
                <div className="flex items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-100 border-2 border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform flex items-center justify-center font-black text-xl text-indigo-600">
                        {msg.senderName[0]}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full text-white shadow-lg ${style.color} group-hover:rotate-12 transition-transform`}>
                        {style.icon}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-black text-slate-900 text-xl">{msg.senderName}</h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-md tracking-widest"><Clock className="inline w-3 h-3 ml-1" /> {msg.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className={`text-sm font-medium line-clamp-1 ${msg.isProcessed ? 'text-slate-400' : 'text-slate-700 font-bold'}`}>
                        {lastMsg?.role === 'model' ? 'ביזי: ' : ''}{lastMsg?.text}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center">
                    {!msg.isProcessed && (
                      <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                    )}
                    <div className="bg-slate-50 text-slate-300 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg transition-all duration-300">
                      <ArrowRight className="w-6 h-6 rotate-180" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white p-10 rounded-[2.5rem] border border-dashed border-slate-200 text-center space-y-4">
            <div className="text-slate-500 font-black text-lg">אין הודעות חדשות</div>
            <p className="text-slate-400 text-sm font-bold">
              כשתגיע הודעה חדשה – היא תופיע כאן מיד.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialInbox;
