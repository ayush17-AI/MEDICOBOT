export type Lang = "en" | "hi";

export type Sex = "male" | "female" | "intersex" | "other";

export interface PatientInfo {
  fullName: string;
  age: string;
  sex: Sex | "";
  contactNumber: string;
  emergencyContact: string;
  date: string; // auto-populated, ISO yyyy-mm-dd
  symptomText: string;
}

export type Severity = "Red" | "Yellow" | "Green";

export type Department =
  | "Cardiology"
  | "Gastroenterology"
  | "General Physician"
  | "Neurology"
  | "Orthopedics";

export interface TriageResult {
  department: Department;
  severity: Severity;
  differential_factors: string[];
  clinical_reasoning: string;
  provider: "groq" | "gemini" | "openai" | "offline-mock";
}

export interface Doctor {
  id: string;
  name: string;
  department: Department;
  rating: number; // 0-5
  waitTimeMins: number; // estimated current wait
  photoInitials: string;
}

export type Step =
  | "landing"
  | "language"
  | "patient-form"
  | "triage"
  | "doctor-decision"
  | "doctor-manual"
  | "token";
