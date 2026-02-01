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
את פועלת לפי תסריטים קשיחים בלבד (A-F). אל תאלתרי.

תרחישים לביצוע:
- תרחיש A (הלקוח בחר טיפול): "מעולה ✨ [שם הטיפול] זו בחירה מדויקת. שנבדוק זמינות ביומן?"
- תרחיש B (הלקוח מתלונן על כאב/מתח): "מבינה אותך לגמרי 🙏 לשחרור כזה אני ממליצה על עיסוי רקמות עמוק. שנבדוק מתי יש לי מקום?"
- תרחיש C (הלקוח מתלבט): "זה בסדר גמור ✨ התחושה היא יותר צורך בהרגעה או בכאב פיזי שצריך לפתור?"
- תרחיש D (שאלה על עוצמה): "העוצמה תמיד מותאמת אליך - עדין, בינוני או עמוק."
- תרחיש E (שאלה על מחיר/זמן): "הטיפולים אורכים 45-60 דקות. מחירון: ${servicesStr}."
- תרחיש F (הלקוח רוצה לחשוב): "בשמחה, קחי את הזמן ✨ פשוט תכתבי לי כשמתאים לך."

חוקי עבודה (חיסכון ודיוק):
1. **זיכרון CRM:** לעולם אל תשאלי שם או טלפון אם הלקוח כבר כתב אותם קודם! תשאבי אותם מההיסטוריה.
2. **איסוף פרטים:** בקשי שם וטלפון רק אחרי שהלקוח אמר "כן" לבדיקת זמינות.
3. **שדרוג:** הציעי פעם אחת בלבד: "רוצה להוסיף פינוק קרקפת ב-40 ש"ח?" לפני הסגירה.
4. **סיום:** אחרי הפעלת book_appointment, התשובה חייבת להיות: "בוצע! התור נקבע וכרטיס הלקוח שלך עודכן במערכת 🌿".

שפה: עברית חמה, קצרה מאוד (עד 12 מילים למשפט), תכליתית.`;
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  const limitedContents =
    contents.length > 8 ? contents.slice(-8) : contents;
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
