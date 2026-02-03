import { GoogleGenAI, Type } from "@google/genai";
import type { BusinessInfo } from "../types";
import {
  cancelAppointment,
  checkAvailability,
  createAppointment,
  upsertCustomerFromBooking,
} from "./_store";

type FunctionCall = {
  name: string;
  args: Record<string, any>;
  id?: string;
};

export type AiAction =
  | { type: "book_appointment"; appointmentId: string; customerPhone: string }
  | { type: "cancel_appointment"; customerPhone?: string; appointmentId?: string }
  | { type: "check_availability"; available: boolean };

function normalizeText(text: string) {
  return (text || "").toLowerCase().trim();
}

function extractLastUserText(contents: any[]): string {
  for (let i = contents.length - 1; i >= 0; i -= 1) {
    const item = contents[i];
    if (item?.role !== "user") continue;
    const parts = Array.isArray(item?.parts) ? item.parts : [];
    const text = parts
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join(" ");
    return text.trim();
  }
  return "";
}

function buildServicesSummary(business: BusinessInfo) {
  const services = business.services || [];
  if (services.length === 0) return "";
  return services
    .map((s) => `• ${s.name} (${s.duration} דק׳) – ₪${s.price}`)
    .join("\n");
}

function getFaqReply(message: string, business: BusinessInfo): string | null {
  const m = normalizeText(message);
  if (!m) return null;

  const isHours =
    m.includes("שעות") ||
    m.includes("שעות פתיחה") ||
    m.includes("שעות פעילות") ||
    m.includes("מתי פתוח") ||
    m.includes("מתי אתם פתוחים");
  const isAddress =
    m.includes("כתובת") || m.includes("איפה") || m.includes("מיקום") || m.includes("איך מגיעים");
  const isPhone =
    m.includes("טלפון") ||
    m.includes("מספר") ||
    m.includes("להתקשר") ||
    m.includes("וואטסאפ") ||
    m.includes("ווטסאפ");
  const isPrice =
    m.includes("מחירון") ||
    m.includes("מחיר") ||
    m.includes("כמה") ||
    m.includes("עולה") ||
    m.includes("תעריף");
  const isServices = m.includes("טיפולים") || m.includes("שירותים") || m.includes("סוגי");

  if (isAddress) {
    return business.address
      ? `הכתובת שלנו: ${business.address}`
      : "כרגע הכתובת לא מעודכנת במערכת.";
  }

  if (isHours) {
    return business.openingHours
      ? `שעות הפעילות שלנו:\n${business.openingHours}`
      : "כרגע שעות הפעילות לא מעודכנות במערכת.";
  }

  if (isPhone) {
    return business.phone ? `אפשר ליצור קשר כאן:\n${business.phone}` : "כרגע מספר הטלפון לא מעודכן במערכת.";
  }

  if (isPrice || isServices) {
    const summary = buildServicesSummary(business);
    return summary
      ? `המחירון שלנו:\n${summary}`
      : "כרגע אין מחירון מעודכן במערכת.";
  }

  return null;
}

const bookAppointmentFunctionDeclaration = {
  name: "book_appointment",
  parameters: {
    type: Type.OBJECT,
    description:
      "Finalizes the booking. Triggered ONLY when Name, Phone, Service, and Time are all confirmed.",
    properties: {
      customerName: { type: Type.STRING },
      customerPhone: { type: Type.STRING },
      serviceId: { type: Type.STRING },
      startTime: { type: Type.STRING, description: "ISO date string" },
      durationMinutes: { type: Type.NUMBER },
      notes: { type: Type.STRING },
    },
    required: ["customerName", "customerPhone", "serviceId", "startTime"],
  },
};

const checkAvailabilityFunctionDeclaration = {
  name: "check_availability",
  parameters: {
    type: Type.OBJECT,
    description: "Checks for free slots in the calendar.",
    properties: {
      dateTime: { type: Type.STRING },
      serviceId: { type: Type.STRING },
      durationMinutes: { type: Type.NUMBER },
    },
    required: ["dateTime"],
  },
};

const cancelAppointmentFunctionDeclaration = {
  name: "cancel_appointment",
  parameters: {
    type: Type.OBJECT,
    description: "Cancels an existing appointment by phone or appointment id.",
    properties: {
      customerPhone: { type: Type.STRING },
      appointmentId: { type: Type.STRING },
    },
  },
};

function buildSystemInstruction(business: BusinessInfo): string {
  const servicesStr = (business.services || [])
    .map((s) => `${s.id}: ${s.name} (₪${s.price})`)
    .join(", ");

  return `את ביזי, המזכירה האוטומטית של "${business.name}". תפקידך: להעביר לקוח במסלול המרה לתור ופתיחת כרטיס CRM.
אל תזכירי "תרחיש", אותיות, או טקסט מערכת.

מידע עסקי שחייב להופיע בתשובות כשנשאלים:
- כתובת: ${business.address || "לא זמין"}
- טלפון: ${business.phone || "לא זמין"}
- שעות פעילות: ${business.openingHours || "לא זמין"}
- מחירון (מזהים ושמות): ${servicesStr || "לא זמין"}

תסריטים מחייבים (בלי להזכיר "תרחיש"):
- לקוח בחר טיפול: "מעולה ✨ [שם הטיפול] זו בחירה מדויקת. שנבדוק זמינות ביומן?"
- לקוח מתלונן על כאב/מתח: "מבינה אותך לגמרי 🙏 לשחרור כזה אני ממליצה על עיסוי רקמות עמוק. שנבדוק מתי יש לי מקום?"
- לקוח מתלבט: "זה בסדר גמור ✨ התחושה היא יותר צורך בהרגעה או בכאב פיזי שצריך לפתור?"
- שאלה על עוצמה: "העוצמה תמיד מותאמת אליך - עדין, בינוני או עמוק."
- שאלה על מחיר/זמן: "הטיפולים אורכים 45-60 דקות. מחירון: ${servicesStr}."
- לקוח רוצה לחשוב: "בשמחה, קחי את הזמן ✨ פשוט תכתבי לי כשמתאים לך."

כללי זיכרון והתנהגות:
1. אל תשאלי שם/טלפון אם כבר נכתבו בשיחה.
2. בקשי שם וטלפון רק אחרי שהלקוח אמר "כן" לבדיקת זמינות.
3. הצעת שדרוג פעם אחת בלבד: "רוצה להוסיף פינוק קרקפת ב-40 ש"ח?" לפני הסגירה.
4. אחרי book_appointment התשובה חייבת להיות: "בוצע! התור נקבע וכרטיס הלקוח שלך עודכן במערכת 🌿".
5. אם נשאלת על כתובת/שעות/טלפון/מחירון – עני ישירות לפי המידע למעלה. אל תגידי "לא יודעת".
6. אם המשתמש כתב שם טיפול חלקי (למשל "שוודי", "אבנים", "פנים", "VIP/זוגי") תזהי את ה-serviceId המתאים.
7. אל תבקשי פורמט ISO. פרשי תאריכים ישראליים (למשל 4/2/26 1400, 4.2.2026 14:00) והמירי ל-YYYY-MM-DDTHH:mm:00 בעצמך. אם יש ספק, שאלי שאלה קצרה אחת.

שפה: עברית חמה וקצרה (עד 12 מילים למשפט), תכליתית.`;
}

function pickServiceDuration(business: BusinessInfo, serviceId?: string) {
  const service = (business.services || []).find((s) => s.id === serviceId);
  return service?.duration || 60;
}

function pickServicePrice(business: BusinessInfo, serviceId?: string) {
  const service = (business.services || []).find((s) => s.id === serviceId);
  return service?.price || 0;
}

export async function generateAssistantReply(params: {
  contents: any[];
  business: BusinessInfo;
  mode?: "standard" | "faq";
}): Promise<{ text: string; actions: AiAction[] }> {
  const { contents, business, mode = "standard" } = params;
  const lastUserText = extractLastUserText(contents);
  const faqReply = getFaqReply(lastUserText, business);
  if (faqReply) {
    return { text: faqReply, actions: [] };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  const limitedContents =
    contents.length > 16 ? contents.slice(-16) : contents;
  const systemInstruction = buildSystemInstruction(business);

  const response = await ai.models.generateContent({
    model: business.aiModel || "gemini-flash-lite-latest",
    contents: limitedContents,
    config: {
      systemInstruction,
      temperature: 0.1,
      tools:
        mode === "standard"
          ? [
              {
                functionDeclarations: [
                  bookAppointmentFunctionDeclaration,
                  checkAvailabilityFunctionDeclaration,
                  cancelAppointmentFunctionDeclaration,
                ],
              },
            ]
          : undefined,
    },
  });

  const actions: AiAction[] = [];
  const functionCalls = (response.functionCalls || []) as FunctionCall[];

  if (functionCalls.length === 0) {
    return {
      text:
        response.text ||
        response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "מצטערת, לא הצלחתי להבין.",
      actions,
    };
  }

  const toolResultsParts: any[] = [];
  for (const fc of functionCalls) {
    if (fc.name === "check_availability") {
      if (!fc.args?.dateTime) {
        toolResultsParts.push({
          functionResponse: {
            id: fc.id,
            name: fc.name,
            response: { result: { available: false, error: "Missing dateTime" } },
          },
        });
        continue;
      }
      const duration =
        Number(fc.args?.durationMinutes) ||
        pickServiceDuration(business, fc.args?.serviceId);
      const available = await checkAvailability({
        startTime: fc.args?.dateTime,
        durationMinutes: duration,
      });
      actions.push({ type: "check_availability", available });
      toolResultsParts.push({
        functionResponse: {
          id: fc.id,
          name: fc.name,
          response: { result: { available } },
        },
      });
      continue;
    }

    if (fc.name === "book_appointment") {
      if (
        !fc.args?.customerName ||
        !fc.args?.customerPhone ||
        !fc.args?.serviceId ||
        !fc.args?.startTime
      ) {
        toolResultsParts.push({
          functionResponse: {
            id: fc.id,
            name: fc.name,
            response: { result: { success: false, error: "Missing fields" } },
          },
        });
        continue;
      }
      const duration =
        Number(fc.args?.durationMinutes) ||
        pickServiceDuration(business, fc.args?.serviceId);
      const appointment = await createAppointment({
        customerName: fc.args?.customerName,
        customerPhone: fc.args?.customerPhone,
        serviceId: fc.args?.serviceId,
        startTime: fc.args?.startTime,
        status: "confirmed",
        durationMinutes: duration,
      });
      const price = pickServicePrice(business, fc.args?.serviceId);
      await upsertCustomerFromBooking({
        name: fc.args?.customerName,
        phone: fc.args?.customerPhone,
        totalSpent: price,
        source: "ai",
        notes: "נקבע דרך Bizie AI",
      });
      actions.push({
        type: "book_appointment",
        appointmentId: appointment.id,
        customerPhone: appointment.customerPhone,
      });
      toolResultsParts.push({
        functionResponse: {
          id: fc.id,
          name: fc.name,
          response: { result: { success: true, appointmentId: appointment.id } },
        },
      });
      continue;
    }

    if (fc.name === "cancel_appointment") {
      if (!fc.args?.appointmentId && !fc.args?.customerPhone) {
        toolResultsParts.push({
          functionResponse: {
            id: fc.id,
            name: fc.name,
            response: { result: { cancelled: false, error: "Missing id/phone" } },
          },
        });
        continue;
      }
      await cancelAppointment({
        id: fc.args?.appointmentId,
        customerPhone: fc.args?.customerPhone,
      });
      actions.push({
        type: "cancel_appointment",
        customerPhone: fc.args?.customerPhone,
        appointmentId: fc.args?.appointmentId,
      });
      toolResultsParts.push({
        functionResponse: {
          id: fc.id,
          name: fc.name,
          response: { result: { cancelled: true } },
        },
      });
      continue;
    }
  }

  const followUpContents = [...limitedContents];
  const modelContent = response.candidates?.[0]?.content;
  if (modelContent) {
    followUpContents.push(modelContent);
  }
  followUpContents.push({ role: "user", parts: toolResultsParts });

  const followUp = await ai.models.generateContent({
    model: business.aiModel || "gemini-flash-lite-latest",
    contents: followUpContents,
    config: {
      systemInstruction,
      temperature: 0.1,
    },
  });

  return {
    text:
      followUp.text ||
      followUp.candidates?.[0]?.content?.parts?.[0]?.text ||
      "בוצע! התור נקבע וכרטיס הלקוח שלך עודכן במערכת 🌿",
    actions,
  };
}
