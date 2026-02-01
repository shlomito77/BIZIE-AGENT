
export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
}

export interface BusinessInfo {
  name: string;
  ownerName: string;
  category: string;
  address: string;
  phone: string;
  services: Service[];
  openingHours: string;
  isCalendarConnected: boolean;
  aiModel?: 'gemini-3-flash-preview' | 'gemini-flash-lite-latest';
  lastSyncTime?: Date;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  startTime: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
  googleEventId?: string;
}

export interface SocialMessage {
  id: string;
  platform: 'instagram' | 'facebook' | 'tiktok' | 'whatsapp' | 'telegram';
  externalId?: string;
  senderName: string;
  text: string;
  timestamp: Date;
  isProcessed: boolean;
  type: 'dm' | 'comment' | 'story_reply';
  chatHistory: ChatMessage[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday?: string;
  joinDate: Date;
  lastVisit: Date;
  visitsCount: number;
  totalSpent: number;
  notes: string;
  preferences: string[];
  source: 'manual' | 'ai' | 'google' | 'facebook' | 'instagram' | 'tiktok' | 'whatsapp' | 'telegram';
  marketingConsent: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export const MOCK_CUSTOMERS: Customer[] = [
  { 
    id: 'c1', 
    name: 'מושון כהן', 
    phone: '050-6776418', 
    email: 'moshon@example.com',
    birthday: '1990-05-12',
    joinDate: new Date('2023-10-15'),
    lastVisit: new Date(), 
    visitsCount: 5,
    totalSpent: 1450, 
    notes: 'מעדיף לחץ חזק בכתפיים. תמיד מגיע 5 דקות לפני.', 
    preferences: ['רקמות עמוק', 'שעות צהריים', 'לחץ חזק'],
    source: 'manual',
    marketingConsent: true
  }
];

export const MOCK_SOCIAL_MESSAGES: SocialMessage[] = [
  { 
    id: 's1', 
    platform: 'instagram', 
    senderName: 'Gal_Beauty', 
    text: 'היי! ראיתי את הסטורי של העיסוי אבנים חמות, זה נראה מדהים. מה המחיר?', 
    timestamp: new Date(), 
    isProcessed: false, 
    type: 'story_reply',
    chatHistory: [{ role: 'user', text: 'היי! ראיתי את הסטורי של העיסוי אבנים חמות, זה נראה מדהים. מה המחיר?', timestamp: new Date() }]
  },
  { 
    id: 's2', 
    platform: 'tiktok', 
    senderName: 'User_992', 
    text: 'וואו איזה קליניקה יפה! איפה אתם נמצאים?', 
    timestamp: new Date(Date.now() - 3600000), 
    isProcessed: false, 
    type: 'comment',
    chatHistory: [{ role: 'user', text: 'וואו איזה קליניקה יפה! איפה אתם נמצאים?', timestamp: new Date(Date.now() - 3600000) }]
  },
  { 
    id: 's3', 
    platform: 'facebook', 
    senderName: 'אבי כהן', 
    text: 'שלום, רציתי לדעת אם יש תור פנוי להיום בערב לזוג', 
    timestamp: new Date(Date.now() - 86400000), 
    isProcessed: true, 
    type: 'dm',
    chatHistory: [
      { role: 'user', text: 'שלום, רציתי לדעת אם יש תור פנוי להיום בערב לזוג', timestamp: new Date(Date.now() - 86400000) },
      { role: 'model', text: 'היי אבי! אבדוק לך מיד. יש לנו מקום ב-19:00, רוצה שאשריין לכם?', timestamp: new Date(Date.now() - 86300000) }
    ]
  }
];
