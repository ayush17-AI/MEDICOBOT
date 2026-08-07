/**
 * fhir/types.ts
 *
 * ⚠️ ASSUMPTION LAYER — READ THIS FIRST ⚠️
 * ------------------------------------------------------------------
 * No application source (app/, lib/, or Supabase schema/migrations)
 * was available when this file was generated — only project config
 * files (package.json, tsconfig.json, next.config.ts, etc.).
 *
 * The shapes below are inferred from the feature set described in
 * README.md (patient kiosk, vitals/symptom capture, doctor dashboard,
 * e-prescriptions). They are intentionally the ONLY place in this
 * FHIR layer that needs to change to match your real Supabase tables.
 *
 * Everything downstream (transformers, routes, validators) is written
 * against these interfaces, not against Supabase directly. To wire
 * this up for real:
 *   1. Edit the interfaces below to match your actual columns.
 *   2. Edit fhir/data/repository.ts — that's the only file that talks
 *      to Supabase. Swap the TODO'd query stubs for real `supabase
 *      .from('...')` calls against your tables.
 * No other file needs to change.
 * ------------------------------------------------------------------
 */

export interface InternalPatient {
  id: string;
  fullName: string;
  dob?: string; // ISO date, e.g. "1990-05-14"
  age?: string | number;
  gender?: "male" | "female" | "other" | "unknown";
  phone?: string;
  countryCode?: string;
  language?: string; // regional language captured at kiosk
  tokenNumber?: string; // room/cabinet navigation token
  department?: string; // allocated specialty, e.g. "Cardiology"
  createdAt?: string; // ISO datetime
}

/**
 * Covers both structured vitals (BP, HR, SpO2) and free-text/coded
 * symptoms captured by the voice triage kiosk.
 */
export interface InternalVitalOrSymptom {
  id: string;
  patientId: string;
  type: "blood_pressure" | "heart_rate" | "spo2" | "symptom";
  recordedAt: string; // ISO datetime

  // For type === "blood_pressure"
  systolic?: number; // mmHg
  diastolic?: number; // mmHg

  // For type === "heart_rate"
  heartRate?: number; // bpm

  // For type === "spo2"
  spo2?: number; // percent

  // For type === "symptom"
  symptomText?: string; // raw or normalized symptom description
  snomedCode?: string; // optional, if you already map symptoms to SNOMED CT

  note?: string;
}

export interface InternalReport {
  id: string;
  patientId: string;
  title: string;
  summary?: string;
  conclusion?: string;
  doctorId?: string;
  createdAt: string; // ISO datetime
  status?: "preliminary" | "final" | "amended";
}

export interface InternalCarePlan {
  id: string;
  patientId: string;
  title: string;
  goals?: string[];
  activities?: string[];
  status?: "draft" | "active" | "completed" | "cancelled";
  createdAt: string; // ISO datetime
}
