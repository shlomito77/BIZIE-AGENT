export type ChatResponse = {
  reply: string;
  bubbles?: string[];
  state?: string;
  mode?: string;
  version?: string;
  sessionId?: string;
};

function getSessionId() {
  const key = "bizie_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const sessionId = getSessionId();
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });
  return res.json();
}

export async function sendChatBubble(bubble: string): Promise<ChatResponse> {
  const sessionId = getSessionId();
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bubble, sessionId }),
  });
  return res.json();
}
