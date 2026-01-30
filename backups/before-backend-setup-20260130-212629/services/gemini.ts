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

// Constants
const MAX_CONTEXT_MESSAGES = 8;
const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const MIN_TEMPERATURE = 0.1;

export class GeminiService {
  private defaultModel = DEFAULT_MODEL;

  public getSystemInstruction(business: BusinessInfo): string {
    const servicesStr = business.services
      .map(s => `${s.id}: ${s.name} (₪${s.price})`)
      .join(', ');
    
    return `את ביזי, המזכירה האוטומטית של "${business.name}". תפקידך: להעביר לקוח במסלול המרה לתור ופתיחת כרטיס CRM.
את פועלת לפי תסריטים קשיחים בלבד (A-F). אל תאלתרי.

תרחישים לביצוע:
- תרחיש A (הלקוח בחר טיפול): "מעולה ��� [שם הטיפול] זו בחירה מדויקת. שנבדוק זמינות ביומן?"
- תרחיש B (הלקוח מתלונן על כאב/מתח): "מבינה אותך לגמרי ��� לשחרור כזה אני ממליצה על עיסוי רקמות עמוק. שנבדוק מתי יש לי מקום?"
- תרחיש C (הלקוח מתלבט): "זה בסדר גמור ��� התחושה היא יותר צורך בהרגעה או בכאב פיזי שצריך לפתור?"
- תרחיש D (שאלה על עוצמה): "העוצמה תמיד מותאמת אליך - עדין, בינוני או עמוק."
- תרחיש E (שאלה על מחיר/זמן): "הטיפולים אורכים 45-60 דקות. מחירון: ${servicesStr}."
- תרחיש F (הלקוח רוצה לחשוב): "בשמחה, קחי את הזמן ��� פשוט תכתבי לי כשמתאים לך."

חוקי עבודה (חיסכון ודיוק):
1. **זיכרון CRM:** לעולם אל תשאלי שם או טלפון אם הלקוח כבר כתב אותם קודם! תשאבי אותם מההיסטוריה.
2. **איסוף פרטים:** בקשי שם וטלפון רק אחרי שהלקוח אמר "כן" לבדיקת זמינות.
3. **שדרוג:** הציעי פעם אחת בלבד: "רוצה להוסיף פינוק קרקפת ב-40 ש"ח?" לפני הסגירה.
4. **סיום:** אחרי הפעלת book_appointment, התשובה חייבת להיות: "בוצע! התור נקבע וכרטיס הלקוח שלך עודכן במערכת ���".

שפה: עברית חמה, קצרה מאוד (עד 12 מילים למשפט), תכליתית.`;
  }

  /**
   * Send a message to Gemini AI and get response with function calling support
   * @param contents Array of message contents in Gemini format
   * @param business Business information for context
   * @returns Promise with Gemini response
   */
  async sendMessage(contents: any[], business: BusinessInfo) {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY not found in environment variables');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Limit context to last N messages to prevent token overflow
      const limitedContents = contents.length > MAX_CONTEXT_MESSAGES 
        ? contents.slice(-MAX_CONTEXT_MESSAGES) 
        : contents;

      return await ai.models.generateContent({
        model: business.aiModel || this.defaultModel,
        contents: limitedContents,
        config: {
          systemInstruction: this.getSystemInstruction(business),
          temperature: MIN_TEMPERATURE,
          tools: [{ 
            functionDeclarations: [
              bookAppointmentFunctionDeclaration, 
              checkAvailabilityFunctionDeclaration
            ] 
          }],
        },
      });
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error('שגיאה בשליחת הודעה ל-AI. נסה שוב.');
    }
  }

  /**
   * Send a message to Gemini AI and get streaming response
   * @param contents Array of message contents in Gemini format
   * @param business Business information for context
   * @yields Text chunks as they arrive
   */
  async *sendMessageStream(contents: any[], business: BusinessInfo) {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY not found in environment variables');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Limit context to last N messages
      const limitedContents = contents.length > MAX_CONTEXT_MESSAGES 
        ? contents.slice(-MAX_CONTEXT_MESSAGES) 
        : contents;

      const result = await ai.models.generateContentStream({
        model: business.aiModel || this.defaultModel,
        contents: limitedContents,
        config: {
          systemInstruction: this.getSystemInstruction(business),
          temperature: MIN_TEMPERATURE,
        },
      });

      for await (const chunk of result) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      console.error('Gemini Stream Error:', error);
      throw new Error('שגיאה בקבלת תגובה מ-AI. נסה שוב.');
    }
  }
}

export const gemini = new GeminiService();
