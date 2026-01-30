/**
 * Secure Gemini API Endpoint
 * This serverless function runs on Vercel's backend
 * API key is stored SERVER-SIDE and never exposed to client
 */

import { GoogleGenAI, Type } from "@google/genai";

// CORS headers for security
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Rate limiting (simple in-memory - for production use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Function declarations
const bookAppointmentFunctionDeclaration = {
  name: 'book_appointment',
  parameters: {
    type: Type.OBJECT,
    description: 'Finalizes the booking',
    properties: {
      customerName: { type: Type.STRING },
      customerPhone: { type: Type.STRING },
      serviceId: { type: Type.STRING },
      startTime: { type: Type.STRING },
      notes: { type: Type.STRING }
    },
    required: ['customerName', 'customerPhone', 'serviceId', 'startTime'],
  },
};

const checkAvailabilityFunctionDeclaration = {
  name: 'check_availability',
  parameters: {
    type: Type.OBJECT,
    description: 'Checks calendar availability',
    properties: {
      dateTime: { type: Type.STRING },
    },
    required: ['dateTime'],
  },
};

export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
      .setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods'])
      .setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers'])
      .end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429)
        .setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
        .json({ error: 'Rate limit exceeded. Try again later.' });
    }

    // Validate request body
    const { contents, business, mode = 'standard' } = req.body;

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: 'Invalid contents format' });
    }

    if (!business || !business.name) {
      return res.status(400).json({ error: 'Invalid business info' });
    }

    // Get API key from environment (SERVER-SIDE ONLY!)
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return res.status(500).json({ error: 'API configuration error' });
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey });

    // Prepare system instruction
    const servicesStr = business.services
      ?.map((s: any) => `${s.id}: ${s.name} (₪${s.price})`)
      .join(', ') || '';
    
    const systemInstruction = `את ביזי, המזכירה האוטומטית של "${business.name}". תפקידך: להעביר לקוח במסלול המרה לתור ופתיחת כרטיס CRM.
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

    // Limit context to prevent token overflow
    const limitedContents = contents.length > 8 ? contents.slice(-8) : contents;

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: business.aiModel || 'gemini-flash-lite-latest',
      contents: limitedContents,
      config: {
        systemInstruction,
        temperature: 0.1,
        tools: mode === 'standard' ? [{ 
          functionDeclarations: [
            bookAppointmentFunctionDeclaration, 
            checkAvailabilityFunctionDeclaration
          ] 
        }] : undefined,
      },
    });

    // Return response with CORS headers
    return res.status(200)
      .setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
      .json({
        success: true,
        response: response,
        functionCalls: response.functionCalls,
        text: response.text,
      });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    
    return res.status(500)
      .setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
      .json({ 
        error: 'Failed to process request',
        message: error.message || 'Unknown error'
      });
  }
}
