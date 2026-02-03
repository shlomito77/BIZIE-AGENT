import React, { useEffect, useRef, useState } from "react";
import type { BusinessInfo, ChatMessage } from "../types";
import { secureGemini } from "../services/geminiSecure";
import { Activity, Bot, Loader2, Maximize2, Minimize2, Phone, Send, Trash2 } from "lucide-react";

interface Props {
  business: BusinessInfo;
  onSyncData?: () => void;
}

type ChatUiMessage = ChatMessage & { id?: number };

const SUGGESTIONS = ["קביעת תור", "מחירון", "דברי איתי"];

const ChatWidget: React.FC<Props> = ({ business, onSyncData }) => {
  const initialMessage: ChatUiMessage = {
    role: "model",
    text: "היי! אני ביזי ✨ איך אפשר לעזור היום?",
    timestamp: new Date(),
  };
  const [messages, setMessages] = useState<ChatUiMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const historyRef = useRef<Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>>([
    { role: "model", parts: [{ text: initialMessage.text }] },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, actionStatus]);

  const resetChat = () => {
    if (!window.confirm("לנקות את השיחה הנוכחית?")) return;
    setMessages([initialMessage]);
    historyRef.current = [{ role: "model", parts: [{ text: initialMessage.text }] }];
    setInput("");
    setActionStatus(null);
  };

  const renderMessage = (msg: ChatUiMessage) => {
    const phoneMatch = msg.text.match(/\d{2,3}-\d{7}/) || msg.text.match(/\d{10}/);
    return (
      <div
        className={`max-w-[85%] p-5 rounded-3xl text-[16px] font-medium whitespace-pre-wrap leading-relaxed shadow-sm border ${
          msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white text-slate-700 border-slate-100"
        }`}
      >
        {msg.text || "..."}
        {msg.role === "model" && phoneMatch && (
          <div className="mt-4">
            <a
              href={`tel:${phoneMatch[0]}`}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-2xl text-sm font-black animate-bounce"
            >
              <Phone className="w-4 h-4 fill-current" /> חיוג מהיר ל{business.ownerName}
            </a>
          </div>
        )}
      </div>
    );
  };

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;

    setIsLoading(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg, timestamp: new Date() }]);
    historyRef.current.push({ role: "user", parts: [{ text: msg }] });

    const needsAction = /קבע|תור|פנוי|מתי|בטל|מחק|זיז|אשר|כן/.test(msg);
    setActionStatus(needsAction ? "מעדכנת מערכת..." : "מייצרת תשובה...");

    try {
      const response = await secureGemini.sendMessage(historyRef.current, business);
      const replyText = response.text || "מצטערת, לא הצלחתי להבין.";
      const botMessageId = Date.now();
      const botTimestamp = new Date();
      setMessages((prev) => [...prev, { role: "model", text: "", timestamp: botTimestamp, id: botMessageId }]);

      let fullText = "";
      const words = replyText.split(" ");
      for (let i = 0; i < words.length; i += 1) {
        fullText = `${fullText}${i === 0 ? "" : " "}${words[i]}`;
        setMessages((prev) =>
          prev.map((m) => (m.id === botMessageId ? { ...m, text: fullText } : m))
        );
        await new Promise((resolve) => setTimeout(resolve, 35));
      }

      const finalText = fullText.trim() || replyText;
      setMessages((prev) =>
        prev.map((m) => (m.id === botMessageId ? { ...m, text: finalText } : m))
      );
      historyRef.current.push({ role: "model", parts: [{ text: finalText }] });

      if (response.actions?.length && onSyncData) {
        setActionStatus("מסנכרנת נתונים...");
        try {
          await Promise.resolve(onSyncData());
        } catch (syncError) {
          console.error("Sync error:", syncError);
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "סליחה, הייתה תקלה רגעית. נסה שוב בעוד רגע 🙏", timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
      setActionStatus(null);
    }
  }

  return (
    <div
      className={`flex flex-col bg-white shadow-2xl transition-all duration-300 text-right ${
        isFullScreen ? "fixed inset-0 z-[100]" : "max-w-6xl mx-auto h-[calc(100vh-6rem)] rounded-[3rem] overflow-hidden"
      }`}
    >
      <div className="bg-indigo-900 text-white p-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h3 className="font-black text-xl">ביזי - המזכירה שלך</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetChat}
            className="p-2 hover:bg-white/10 rounded-xl text-indigo-100 hover:text-white"
            aria-label="נקה שיחה"
            title="נקה שיחה"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-white/10 rounded-xl">
            {isFullScreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/20" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={msg.id ?? i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-in fade-in`}>
            {renderMessage(msg)}
          </div>
        ))}
        {actionStatus && (
          <div className="flex justify-start">
            <div className="bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-full text-[11px] font-black flex items-center gap-2 animate-pulse">
              <Activity className="w-3 h-3" /> {actionStatus}
            </div>
          </div>
        )}
        {isLoading && !actionStatus && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl px-4 py-2 text-sm">
              כותבת...
            </div>
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 bg-white border-t border-slate-50 shrink-0">
        <div className="flex flex-wrap gap-2.5 mb-6 justify-end">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={isLoading}
              className="border-2 px-5 py-2.5 rounded-2xl text-[11px] font-black border-slate-100 text-slate-400 hover:border-indigo-600 hover:text-indigo-600 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <input
            className="flex-1 bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-4 outline-none font-bold text-right text-lg"
            placeholder="איך אוכל לעזור?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={isLoading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl disabled:opacity-30"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
