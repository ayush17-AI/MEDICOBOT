import type { Lang } from "./types";

export const t = {
  back: { en: "← Back", hi: "← पीछे जाएं" },
  selectLanguage: { en: "Select Language", hi: "भाषा चुनें" },
  english: { en: "English", hi: "English" },
  hindi: { en: "हिंदी (Hindi)", hi: "हिंदी" },
  patientInfoTitle: { en: "Patient Details", hi: "रोगी विवरण" },
  fullName: { en: "Full Name", hi: "नाम" },
  age: { en: "Age", hi: "आयु" },
  sex: { en: "Sex", hi: "लिंग" },
  male: { en: "Male", hi: "पुरुष" },
  female: { en: "Female", hi: "महिला" },
  intersex: { en: "Intersex", hi: "इंटरसेक्स" },
  other: { en: "Other", hi: "अन्य" },
  contactNumber: { en: "Contact Number (WhatsApp)", hi: "व्हाट्सएप नंबर" },
  emergencyContact: { en: "Emergency Contact Number", hi: "आपातकालीन संपर्क नंबर" },
  date: { en: "Date", hi: "दिनांक" },
  symptoms: { en: "Describe your symptoms", hi: "अपने लक्षण बताएं" },
  proceedToTriage: { en: "Proceed to AI Symptom Triage →", hi: "लक्षण जांच शुरू करें →" },
  listening: { en: "Listening…", hi: "सुन रहा है…" },
  analyzing: { en: "Analyzing your symptoms…", hi: "आपके लक्षणों का विश्लेषण हो रहा है…" },
  howChooseDoctor: {
    en: "How would you like to choose your doctor?",
    hi: "आप अपने डॉक्टर का चयन कैसे करना चाहते हैं?",
  },
  selectOwnDoctor: { en: "Select On Your Own", hi: "खुद डॉक्टर चुनें" },
  askAiRecommend: { en: "Ask AI to Recommend", hi: "AI को चुनने दें" },
  aiBestMatch: {
    en: "🤖 AI Best Match (Highest Rating + Lowest Wait Time)",
    hi: "🤖 AI सर्वश्रेष्ठ मिलान (उच्चतम रेटिंग + न्यूनतम प्रतीक्षा)",
  },
  yourToken: { en: "Your Token", hi: "आपका टोकन" },
  printToken: { en: "Print Token", hi: "टोकन प्रिंट करें" },
  sendWhatsapp: { en: "Send WhatsApp Alert", hi: "व्हाट्सएप पर भेजें" },
  waitTime: { en: "Estimated Wait", hi: "अनुमानित प्रतीक्षा" },
  minsShort: { en: "min", hi: "मिनट" },
  required: { en: "This field is required", hi: "यह फ़ील्ड आवश्यक है" },
} as const;

export type TKey = keyof typeof t;

export function tr(key: TKey, lang: Lang): string {
  return t[key][lang];
}
