import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import { applyCors, handleOptions, requireAuth } from "./_auth";
import { enforceRateLimit } from "./_ratelimit";
import { captureError } from "./_monitoring";
import { getBusiness, getConversationFlow } from "./_store";

type Role = "user" | "model";
type HistoryItem = { role: Role; parts: Array<{ text: string }> };

type Business = {
  name?: string;
  phone?: string;
  address?: string;
  openingHours?: string;
  hours?: string;
  services?: Array<{ id?: string; name: string; price?: number; duration?: number; description?: string }>;
  policies?: string;
};

type ChatBody = {
  message?: string;
  bubble?: string; // when user clicks a suggested bubble
  sessionId?: string; // client-provided stable id
  history?: HistoryItem[];
};

type FlowState = {
  state: string;
  data: Record<string, any>;
};

type FlowConfig = {
  version?: string;
  initialState: string;
  states: Record<
    string,
    {
      type: string;
      botText: string;
      next?: string;
      key?: string;
      bubbles?: string[];
      transitions?: Array<{ when: "bubble"; is: string; next: string; set?: Record<string, any> }>;
      guardFlowFirst?: boolean;
    }
  >;
};

const memStore = new Map<string, FlowState>(); // V1 in-memory store

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

function interpolate(template: string, ctx: Record<string, any>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = ctx[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Flow-first answers for FAQs (hours/address/phone/services/policies) */
function flowFirstAnswer(msg: string, business?: Business) {
  const m = normalize(msg);
  const hours = business?.openingHours || business?.hours;

  const isHours = m.includes("שעות") || m.includes("פתוח") || m.includes("מתי אתם פתוחים") || m.includes("מתי פתוח");
  const isAddress = m.includes("כתובת") || m.includes("איפה") || m.includes("מיקום") || m.includes("איך מגיעים");
  const isPhone =
    m.includes("טלפון") || m.includes("מספר") || m.includes("להתקשר") || m.includes("וואטסאפ") || m.includes("ווטסאפ");
  const isPrice = m.includes("מחיר") || m.includes("עולה") || m.includes("כמה") || m.includes("תעריף") || m.includes("מחירון");
  const isServices = m.includes("טיפולים") || m.includes("סוגי") || m.includes("עיסוי") || m.includes("שירותים");
  const isCancel = m.includes("לבטל") || m.includes("ביטול") || m.includes("דחייה") || m.includes("לשנות תור");

  if (isHours && hours) return `שעות הפעילות שלנו:\n${hours}`;
  if (isAddress && business?.address) return `המיקום שלנו:\n${business.address}`;
  if (isPhone && business?.phone) return `אפשר ליצור קשר כאן:\n${business.phone}`;
  if (isCancel && business?.policies) return `מדיניות ביטולים/שינויים:\n${business.policies}`;

  if ((isServices || isPrice) && business?.services?.length) {
    const lines = business.services.slice(0, 12).map((s) => {
      const desc = s.description ? `\n  ${s.description}` : "";
      return `- ${s.name}${desc}`;
    });
    return `אלו הטיפולים אצלנו:\n${lines.join("\n")}`;
  }

  return null;
}

function pickSessionId(req: VercelRequest, body: ChatBody) {
  const q = req.query?.sessionId;
  const fromQuery = typeof q === "string" ? q.trim() : "";
  return (body.sessionId || fromQuery || "anon").trim() || "anon";
}

function getState(flow: FlowConfig, sessionId: string): FlowState {
  const existing = memStore.get(sessionId);
  if (existing) return existing;
  const init: FlowState = { state: flow.initialState, data: {} };
  memStore.set(sessionId, init);
  return init;
}

function setState(sessionId: string, st: FlowState) {
  memStore.set(sessionId, st);
}

function buildTreatmentsNumbered(business: Business) {
  const svcs = business.services || [];
  const lines = svcs.map((s, idx) => {
    const n = idx + 1;
    const desc = s.description ? `\n   ${s.description}` : "";
    return `${n}) ${s.name}${desc}`;
  });
  const bubbles = svcs.map((_, idx) => String(idx + 1));
  return { lines, bubbles };
}

function isNumericSelection(s: string) {
  return /^[1-9]\d*$/.test((s || "").trim());
}

async function aiFallback(message: string, business: Business) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "אפשר לשאול אותי על טיפולים/מחירון/שעות/כתובת/טלפון 😊";
  }

  const system = `
את Bizie – מזכירה דיגיטלית למכון עיסוי.
עני קצר, נעים, בעברית, עם אימוג׳י עדין.
אל תאבחני רפואית. אם יש דגל אדום (חולשה/נימול חמור/חום/טראומה) הפני לרופא/מוקד.
אם השאלה קשורה למחירון/שעות/כתובת/טלפון – עני לפי פרטי העסק שסופקו.
`.trim();

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.0-flash";

  const context = `
פרטי העסק:
שעות: ${business.openingHours || business.hours || ""}
כתובת: ${business.address || ""}
טלפון: ${business.phone || ""}
מדיניות: ${business.policies || ""}
טיפולים: ${(business.services || []).map((s) => s.name).join(", ")}
`.trim();

  const chat = ai.chats.create({
    model,
    history: [],
    config: { systemInstruction: `${system}\n\n${context}` },
  });

  const result = await chat.sendMessage({ message });
  return result.text || "מצטערת, לא הצלחתי לענות כרגע 🙏";
}

/**
 * Execute one turn of the flow.
 * Returns { reply, bubbles, state }
 */
async function runFlowTurn(params: {
  flow: FlowConfig;
  sessionId: string;
  business: Business;
  inputText: string;
  inputKind: "text" | "bubble";
}) {
  const { flow, sessionId, business, inputText, inputKind } = params;
  const st = getState(flow, sessionId);
  const stateDef = flow.states[st.state];

  // Safety: if state missing
  if (!stateDef) {
    const reset: FlowState = { state: flow.initialState, data: {} };
    setState(sessionId, reset);
    const def = flow.states[flow.initialState];
    return {
      reply: def?.botText || "היי 😊 איך אפשר לעזור?",
      bubbles: def?.bubbles || [],
      state: flow.initialState,
      mode: "flow",
    };
  }

  const ctx: Record<string, any> = {
    ...st.data,
    name: st.data.name || "",
    address: business.address || "",
    policies: business.policies || "",
  };

  // ---- Transitions by state type ----

  // GREETING / UPDATE_NAME etc: collect_text
  if (stateDef.type === "collect_text") {
    const key = stateDef.key || "value";
    const value = (inputText || "").trim();
    if (value) st.data[key] = value;
    const next = stateDef.next || flow.initialState;
    st.state = next;
    setState(sessionId, st);

    // On entry of SHOW_TREATMENTS: present numbered list + bubbles
    if (next === "SHOW_TREATMENTS") {
      const { lines, bubbles } = buildTreatmentsNumbered(business);
      const botText = interpolate(flow.states.SHOW_TREATMENTS.botText, { ...ctx, ...st.data });
      return {
        reply: `${botText}\n${lines.join("\n")}`,
        bubbles: [...bubbles, "יש לי שאלה"],
        state: next,
        mode: "flow",
      };
    }

    const def = flow.states[next];
    return {
      reply: interpolate(def.botText, { ...ctx, ...st.data }),
      bubbles: def.bubbles || [],
      state: next,
      mode: "flow",
    };
  }

  // SHOW_TREATMENTS: number selection or question
  if (st.state === "SHOW_TREATMENTS") {
    const choice = (inputText || "").trim();
    if (choice === "יש לי שאלה") {
      st.state = "FREE_QUESTION";
      setState(sessionId, st);
      const def = flow.states.FREE_QUESTION;
      return { reply: def.botText, bubbles: def.bubbles || [], state: st.state, mode: "flow" };
    }

    if (isNumericSelection(choice)) {
      const idx = parseInt(choice, 10) - 1;
      const svc = business.services?.[idx];
      if (svc) {
        st.data.treatmentIndex = idx + 1;
        st.data.treatmentName = svc.name;
        st.data.treatmentDescription = svc.description || "";
        st.state = "CHOOSE_DURATION";
        setState(sessionId, st);

        // CHOOSE_DURATION entry: you wanted "send 3 prices numbered + bubbles durations"
        // We'll use fixed multipliers if service doesn't have prices-per-duration.
        // If you later add explicit prices, replace this.
        const base60 = typeof svc.price === "number" ? svc.price : 300;
        const price45 = Math.round(base60 * 0.8);
        const price60 = base60;
        const price90 = Math.round(base60 * 1.4);

        st.data.price45 = price45;
        st.data.price60 = price60;
        st.data.price90 = price90;

        const def = flow.states.CHOOSE_DURATION;
        const reply = `בחירה מצוינת, ${st.data.name || "🌿"} 🌿\n${
          svc.description ? svc.description + "\n\n" : ""
        }${interpolate(def.botText, { ...ctx, ...st.data })}`;

        return {
          reply,
          bubbles: ["45 דקות", "60 דקות", "90 דקות", "לשנות טיפול"],
          state: st.state,
          mode: "flow",
        };
      }
    }

    // fallback: re-show treatments
    const { lines, bubbles } = buildTreatmentsNumbered(business);
    const botText = interpolate(flow.states.SHOW_TREATMENTS.botText, { ...ctx, ...st.data });
    return { reply: `${botText}\n${lines.join("\n")}`, bubbles: [...bubbles, "יש לי שאלה"], state: st.state, mode: "flow" };
  }

  // CHOOSE_DURATION: bubble transitions
  if (st.state === "CHOOSE_DURATION") {
    const def = flow.states.CHOOSE_DURATION;
    const t = def.transitions || [];
    const hit = t.find((x) => x.when === "bubble" && x.is === inputText);
    if (hit) {
      if (hit.set) Object.assign(st.data, hit.set);
      st.state = hit.next;
      setState(sessionId, st);

      const nextDef = flow.states[st.state];

      if (st.state === "POST_PRICE_OPTIONS") {
        return {
          reply: interpolate(nextDef.botText, { ...ctx, ...st.data }),
          bubbles: nextDef.bubbles || ["בדיקת זמינות", "יש לי שאלה", "לשנות משך טיפול"],
          state: st.state,
          mode: "flow",
        };
      }

      // change treatment
      if (st.state === "SHOW_TREATMENTS") {
        const { lines, bubbles } = buildTreatmentsNumbered(business);
        const botText = interpolate(flow.states.SHOW_TREATMENTS.botText, { ...ctx, ...st.data });
        return { reply: `${botText}\n${lines.join("\n")}`, bubbles: [...bubbles, "יש לי שאלה"], state: st.state, mode: "flow" };
      }
    }

    // If user typed instead of bubble, remind
    return {
      reply: "כדי שאמשיך 🙂 בחר/י משך טיפול מהאפשרויות למטה:",
      bubbles: ["45 דקות", "60 דקות", "90 דקות", "לשנות טיפול"],
      state: st.state,
      mode: "flow",
    };
  }

  // POST_PRICE_OPTIONS
  if (st.state === "POST_PRICE_OPTIONS") {
    const def = flow.states.POST_PRICE_OPTIONS;
    const t = def.transitions || [];
    const hit = t.find((x) => x.when === "bubble" && x.is === inputText);
    if (hit) {
      st.state = hit.next;
      setState(sessionId, st);
      const nextDef = flow.states[st.state];
      return { reply: interpolate(nextDef.botText, { ...ctx, ...st.data }), bubbles: nextDef.bubbles || [], state: st.state, mode: "flow" };
    }
    return { reply: "בחר/י אחת מהאפשרויות למטה 😊", bubbles: def.bubbles || [], state: st.state, mode: "flow" };
  }

  // ASK_DATE_TIME_PREF -> COLLECT_DATE_TIME
  if (st.state === "ASK_DATE_TIME_PREF") {
    // store preference if bubble chosen
    const v = (inputText || "").trim();
    if (v) st.data.dateTimeOrPreference = v;
    st.state = "CONFIRM_BOOKING_NAME";
    setState(sessionId, st);

    const def = flow.states.CONFIRM_BOOKING_NAME;
    return {
      reply: interpolate(def.botText, { ...ctx, ...st.data }),
      bubbles: ["כן", "לא (לעדכן שם)"],
      state: st.state,
      mode: "flow",
    };
  }

  // CONFIRM_BOOKING_NAME
  if (st.state === "CONFIRM_BOOKING_NAME") {
    const choice = (inputText || "").trim();
    if (choice === "כן") {
      st.state = "SUMMARY";
      setState(sessionId, st);
      const def = flow.states.SUMMARY;
      return {
        reply: interpolate(def.botText, { ...ctx, ...st.data }),
        bubbles: def.bubbles || ["לבטל תור", "לשנות תור", "יש לי שאלה", "סיום"],
        state: st.state,
        mode: "flow",
      };
    }
    if (choice.startsWith("לא")) {
      st.state = "UPDATE_NAME";
      setState(sessionId, st);
      const def = flow.states.UPDATE_NAME;
      return { reply: def.botText, bubbles: def.bubbles || [], state: st.state, mode: "flow" };
    }
    return { reply: "רק כדי לוודא 🙂 הטיפול על שמך? בחר/י כן / לא", bubbles: ["כן", "לא (לעדכן שם)"], state: st.state, mode: "flow" };
  }

  // FREE_QUESTION: AI optional + then back to POST_PRICE_OPTIONS
  if (st.state === "FREE_QUESTION") {
    // First, try flow-first FAQs even inside free question
    const fast = flowFirstAnswer(inputText, business);
    if (fast) {
      // stay in POST_PRICE_OPTIONS after answering
      st.state = "POST_PRICE_OPTIONS";
      setState(sessionId, st);
      const def = flow.states.POST_PRICE_OPTIONS;
      return { reply: fast, bubbles: def.bubbles || ["בדיקת זמינות", "יש לי שאלה", "לשנות משך טיפול"], state: st.state, mode: "flow" };
    }

    const reply = await aiFallback(inputText, business);
    st.state = "POST_PRICE_OPTIONS";
    setState(sessionId, st);
    const def = flow.states.POST_PRICE_OPTIONS;
    return { reply, bubbles: def.bubbles || ["בדיקת זמינות", "יש לי שאלה", "לשנות משך טיפול"], state: st.state, mode: "ai" };
  }

  // SUMMARY menu
  if (st.state === "SUMMARY") {
    const choice = (inputText || "").trim();
    if (choice === "סיום") {
      st.state = "END";
      setState(sessionId, st);
      const def = flow.states.END;
      return { reply: def.botText, bubbles: [], state: st.state, mode: "flow" };
    }
    if (choice === "לבטל תור") {
      st.state = "CANCEL_FLOW";
      setState(sessionId, st);
      const def = flow.states.CANCEL_FLOW;
      return { reply: def.botText, bubbles: [], state: st.state, mode: "flow" };
    }
    if (choice === "לשנות תור") {
      st.state = "RESCHEDULE_FLOW";
      setState(sessionId, st);
      const def = flow.states.RESCHEDULE_FLOW;
      return { reply: def.botText, bubbles: [], state: st.state, mode: "flow" };
    }
    if (choice === "יש לי שאלה") {
      st.state = "FREE_QUESTION";
      setState(sessionId, st);
      const def = flow.states.FREE_QUESTION;
      return { reply: def.botText, bubbles: [], state: st.state, mode: "flow" };
    }

    const def = flow.states.SUMMARY;
    return { reply: "בחר/י פעולה מהאפשרויות למטה 😊", bubbles: def.bubbles || [], state: st.state, mode: "flow" };
  }

  // Default: reset
  st.state = flow.initialState;
  st.data = {};
  setState(sessionId, st);
  const def = flow.states[flow.initialState];
  return { reply: def.botText, bubbles: def.bubbles || [], state: st.state, mode: "flow" };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (handleOptions(req, res)) return;
    if (!applyCors(req, res)) return;
    if (!(await requireAuth(req, res))) return;
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }
    if (
      !(await enforceRateLimit({
        req,
        res,
        key: "chat",
        limit: 60,
        windowMs: 60_000,
      }))
    ) {
      return;
    }

    const body = (req.body || {}) as ChatBody;
    const sessionId = pickSessionId(req, body);

    const inputText = (body.bubble || body.message || "").toString();
    if (!inputText.trim()) return res.status(400).json({ error: "Missing message/bubble" });

    const business = await getBusiness();
    const flow = (await getConversationFlow()) as FlowConfig | null;

    // If flow missing, fallback to old behavior
    if (!flow) {
      const fast = flowFirstAnswer(inputText, business);
      if (fast) return res.status(200).json({ reply: fast, mode: "flow", bubbles: [] });

      const reply = await aiFallback(inputText, business);
      return res.status(200).json({ reply, mode: "ai", bubbles: [] });
    }

    const inputKind: "text" | "bubble" = body.bubble ? "bubble" : "text";

    const out = await runFlowTurn({ flow, sessionId, business, inputText, inputKind });
    return res.status(200).json({
      reply: out.reply,
      bubbles: out.bubbles || [],
      state: out.state,
      mode: out.mode,
      version: flow.version || "bizie-flow",
      sessionId,
    });
  } catch (err: any) {
    captureError(err, { route: "chat" });
    return res.status(500).json({
      reply: "סליחה, הייתה תקלה רגעית. נסה שוב בעוד רגע 🙏",
      mode: "error",
    });
  }
}
