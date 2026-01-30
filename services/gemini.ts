
  import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
  import { BusinessInfo } from "../types";

  export const bookAppointmentFunctionDeclaration: FunctionDeclaration = {
    name: 'book_appointment',
    parameters: {
      type: Type.OBJECT,
      description: 'Finalizes the booking. Triggered ONLY when Name, Phone, Service, and Time are all confirmed.',
      properties: {
        customerName: { type: Type.STRING },
        customerPhone: { type: Type.STRING },
        serviceId: { type: Type.STRING },
        startTime: { type: Type.STRING, description: 'ISO date string' },
        notes: { type: Type.STRING }
      },
      required: ['customerName', 'customerPhone', 'serviceId', 'startTime'],
    },
  };

  export const checkAvailabilityFunctionDeclaration: FunctionDeclaration = {
    name: 'check_availability',
    parameters: {
      type: Type.OBJECT,
      description: 'Checks for free slots in the calendar.',
      properties: {
        dateTime: { type: Type.STRING },
      },
      required: ['dateTime'],
    },
  };

  export class GeminiService {
    private defaultModel = 'gemini-flash-lite-latest';

    public getSystemInstruction(business: BusinessInfo) {
      const servicesStr = business.services.map(s => `${s.id}: ${s.name} (₪${s.price})`).join(', ');
      
      return `את ביזי, המזכירה האוטומטית של "${business.name}". תפקידך: להעביר לקוח במסלול המרה לתור ופתיחת כרטיס CRM.
  את פועלת לפי תסריטים קשיחים בלבד (A-F). אל תאלתרי.

  תרחישים לביצוע:
  - תרחיש A (הלקוח בחר טיפול): "מעולה 😊 [שם הטיפול] זו בחירה מדויקת. שנבדוק זמינות ביומן?"
  - תרחיש B (הלקוח מתלונן על כאב/מתח): "מבינה אותך לגמרי 🙏 לשחרור כזה אני ממליצה על עיסוי רקמות עמוק. שנבדוק מתי יש לי מקום?"
  - תרחיש C (הלקוח מתלבט): "זה בסדר גמור 😊 התחושה היא יותר צורך בהרגעה או בכאב פיזי שצריך לפתור?"
  - תרחיש D (שאלה על עוצמה): "העוצמה תמיד מותאמת אליך - עדין, בינוני או עמוק."
  - תרחיש E (שאלה על מחיר/זמן): "הטיפולים אורכים 45-60 דקות. מחירון: ${servicesStr}."
  - תרחיש F (הלקוח רוצה לחשוב): "בשמחה, קחי את הזמן 😊 פשוט תכתבי לי כשמתאים לך."

  חוקי עבודה (חיסכון ודיוק):
  1. **זיכרון CRM:** לעולם אל תשאלי שם או טלפון אם הלקוח כבר כתב אותם קודם! תשאבי אותם מההיסטוריה.
  2. **איסוף פרטים:** בקשי שם וטלפון רק אחרי שהלקוח אמר "כן" לבדיקת זמינות.
  3. **שדרוג:** הציעי פעם אחת בלבד: "רוצה להוסיף פינוק קרקפת ב-40 ש"ח?" לפני הסגירה.
  4. **סיום:** אחרי הפעלת book_appointment, התשובה חייבת להיות: "בוצע! התור נקבע וכרטיס הלקוח שלך עודכן במערכת 🌿".

  שפה: עברית חמה, קצרה מאוד (עד 12 מילים למשפט), תכליתית.`;
    }

    async sendMessage(contents: any[], business: BusinessInfo) {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      return await ai.models.generateContent({
        model: business.aiModel || this.defaultModel,
        contents: contents.length > 8 ? contents.slice(-8) : contents,
        config: {
          systemInstruction: this.getSystemInstruction(business),
          temperature: 0.1, // Minimal creativity
          tools: [{ functionDeclarations: [bookAppointmentFunctionDeclaration, checkAvailabilityFunctionDeclaration] }],
        },
      });
    }

    async *sendMessageStream(contents: any[], business: BusinessInfo) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const result = await ai.models.generateContentStream({
        model: business.aiModel || this.defaultModel,
        contents: contents.length > 8 ? contents.slice(-8) : contents,
        config: {
          systemInstruction: this.getSystemInstruction(business),
          temperature: 0.1,
        },
      });
      for await (const chunk of result) {
        if (chunk.text) yield chunk.text;
      }
    }
  }

  export const gemini = new GeminiService();
