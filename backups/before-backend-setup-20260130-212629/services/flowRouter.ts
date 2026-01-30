type Knowledge = any;

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatHours(hours: any) {
  const order = [
    ["sun", "א׳"], ["mon", "ב׳"], ["tue", "ג׳"], ["wed", "ד׳"],
    ["thu", "ה׳"], ["fri", "ו׳"], ["sat", "ש׳"]
  ] as const;

  return order
    .map(([k, label]) => `${label}: ${hours?.[k] ?? "לא מוגדר"}`)
    .join("\n");
}

export type FlowResult =
  | { handled: true; reply: string; intent: string }
  | { handled: false };

export function tryFlow(message: string, knowledge: Knowledge): FlowResult {
  const t = norm(message);

  // שעות פעילות
  if (t.includes("שעות") || t.includes("פתוח") || t.includes("פעילות")) {
    return {
      handled: true,
      intent: "hours",
      reply: `שעות הפעילות הן:\n${formatHours(knowledge.hours)}`
    };
  }

  // כתובת / מיקום
  if (t.includes("כתובת") || t.includes("מיקום") || t.includes("איפה") || t.includes("נמצא")) {
    const addr = knowledge?.location?.address || "הכתובת עדיין לא הוגדרה";
    const city = knowledge?.location?.city ? `, ${knowledge.location.city}` : "";
    const maps = knowledge?.location?.googleMapsUrl ? `\nקישור לניווט: ${knowledge.location.googleMapsUrl}` : "";
    return { handled: true, intent: "location", reply: `הכתובת: ${addr}${city}${maps}` };
  }

  // מחירון / מחיר
  if (t.includes("מחיר") || t.includes("מחירון") || t.includes("כמה עולה")) {
    const list = (knowledge.treatments || [])
      .map((x: any) => `• ${x.name} (${x.durationMin} דק׳) – ${x.priceNis ? x.priceNis + " ₪" : "מחיר לא עודכן"}`)
      .join("\n");
    return {
      handled: true,
      intent: "pricing",
      reply: list ? `המחירים כרגע:\n${list}` : "עדיין אין מחירון מוגדר. איזה טיפול ומשך רצית?"
    };
  }

  // ביטול / מדיניות
  if (t.includes("ביטול") || t.includes("לבטל") || t.includes("מדיניות")) {
    return { handled: true, intent: "policies", reply: knowledge?.policies?.cancellation || "אין מדיניות ביטול מוגדרת עדיין." };
  }

  // טלפון / יצירת קשר
  if (t.includes("טלפון") || t.includes("ווטסאפ") || t.includes("whatsapp") || t.includes("צור קשר")) {
    const c = knowledge?.contact || {};
    const parts = [
      c.phone ? `טלפון: ${c.phone}` : null,
      c.whatsapp ? `וואטסאפ: ${c.whatsapp}` : null,
      c.telegram ? `טלגרם: ${c.telegram}` : null,
      c.instagram ? `אינסטגרם: ${c.instagram}` : null
    ].filter(Boolean);
    return { handled: true, intent: "contact", reply: parts.length ? parts.join("\n") : "אין פרטי קשר מוגדרים עדיין." };
  }

  return { handled: false };
}
