import React, { useEffect, useRef, useState } from "react";
import type { BusinessInfo, Appointment, ChatMessage } from "../types";
import { sendToBizieChat } from "../services/chatApi";

interface Props {
  business: BusinessInfo;
  appointments: Appointment[];
  onBook: (app: Omit<Appointment, "id">) => void;
  onCancel: (id: string) => void;
}

const ChatWidget: React.FC<Props> = ({ business }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "model", text: "היי! אני ביזי ✨ איך אפשר לעזור היום?", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Gemini-format history (server uses it)
  const historyRef = useRef<Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>>([
    { role: "model", parts: [{ text: "היי! אני ביזי ✨ איך אפשר לעזור היום?" }] },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || isLoading) return;

    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: msg, timestamp: new Date() }]);
    historyRef.current.push({ role: "user", parts: [{ text: msg }] });

    try {
      const resp = await sendToBizieChat({
        message: msg,
        history: historyRef.current,
        business,
      });

      setMessages((prev) => [...prev, { role: "model", text: resp.reply, timestamp: new Date() }]);
      historyRef.current.push({ role: "model", parts: [{ text: resp.reply }] });
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "סליחה, הייתה תקלה רגעית. נסה שוב בעוד רגע 🙏", timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden text-right">
      <div className="bg-indigo-950 text-white p-5 flex items-center justify-between">
        <div>
          <div className="font-black text-lg leading-none">ביזי</div>
          <div className="text-indigo-200 text-xs font-bold mt-1">Flow-first + AI fallback</div>
        </div>
      </div>

      <div ref={scrollRef} className="h-[60vh] overflow-y-auto p-5 space-y-4 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                (m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-800 border border-slate-200") +
                " max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap leading-relaxed"
              }
            >
              {m.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl px-4 py-2 text-sm">
              כותבת...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2 justify-end mb-3">
          {["מה שעות הפעילות?", "מה המחירון?", "מה הכתובת?"].map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={isLoading}
              className="px-3 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-indigo-500 hover:text-indigo-700"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 rounded-2xl bg-indigo-600 text-white font-black disabled:opacity-40"
          >
            שלח
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-right font-bold outline-none focus:border-indigo-500 focus:bg-white"
            placeholder="כתוב הודעה..."
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
