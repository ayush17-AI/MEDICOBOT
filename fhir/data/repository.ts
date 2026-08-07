/**
 * fhir/data/repository.ts
 *
 * Database adapter wiring for FHIR R4 API layer.
 * Interacts with Supabase `patient_records` table.
 */

import { createClient } from "@supabase/supabase-js";
import type {
  InternalPatient,
  InternalVitalOrSymptom,
  InternalReport,
  InternalCarePlan,
} from "../types";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

function mapRowToPatient(data: any): InternalPatient {
  const kiosk = data.kiosk_data || {};
  let gender: InternalPatient["gender"] = undefined;
  if (kiosk.sex || kiosk.gender) {
    const rawGender = (kiosk.sex || kiosk.gender).toLowerCase();
    if (["male", "female", "other", "unknown"].includes(rawGender)) {
      gender = rawGender as InternalPatient["gender"];
    } else {
      gender = "unknown";
    }
  }

  return {
    id: String(data.id),
    fullName: data.patient_name || kiosk.name || kiosk.fullName || "Unknown Patient",
    age: kiosk.age,
    gender,
    phone: data.phone_number || kiosk.phone,
    countryCode: kiosk.countryCode,
    language: kiosk.language,
    tokenNumber: kiosk.tokenNumber || kiosk.token || kiosk.token_number,
    department: kiosk.triage?.department || kiosk.department,
    createdAt: data.created_at || new Date().toISOString(),
  };
}

export async function getPatientById(
  id: string
): Promise<InternalPatient | null> {
  const supabase = getSupabase();

  // Search by primary id
  const { data: primaryData } = await supabase
    .from("patient_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (primaryData) {
    return mapRowToPatient(primaryData);
  }

  // Fallback search by token/kiosk token
  const { data: allRecords } = await supabase
    .from("patient_records")
    .select("*");

  if (allRecords && allRecords.length > 0) {
    const matched = allRecords.find(
      (r: any) =>
        r.kiosk_data?.tokenNumber === id ||
        r.kiosk_data?.token === id ||
        r.kiosk_data?.token_number === id
    );
    if (matched) {
      return mapRowToPatient(matched);
    }
  }

  return null;
}

export async function getAllPatients(): Promise<InternalPatient[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("patient_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || !Array.isArray(data)) {
      return [];
    }

    return data.map((row: any) => mapRowToPatient(row));
  } catch (err) {
    console.error("Error fetching all patients:", err);
    return [];
  }
}

export async function createPatient(
  patient: Omit<InternalPatient, "id" | "createdAt">
): Promise<InternalPatient> {
  const supabase = getSupabase();

  const kioskData = {
    name: patient.fullName,
    fullName: patient.fullName,
    age: patient.age,
    sex: patient.gender,
    gender: patient.gender,
    phone: patient.phone,
    countryCode: patient.countryCode,
    language: patient.language,
    tokenNumber: patient.tokenNumber,
    department: patient.department,
  };

  const { data, error } = await supabase
    .from("patient_records")
    .insert([
      {
        patient_name: patient.fullName,
        phone_number: patient.phone || "",
        symptoms: "Pending AI Symptom Evaluation",
        kiosk_data: kioskData,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create patient record in Supabase: ${error?.message || "Unknown error"}`);
  }

  return mapRowToPatient(data);
}

export async function getObservationsByPatientId(
  patientId: string
): Promise<InternalVitalOrSymptom[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("patient_records")
    .select("*")
    .eq("id", patientId)
    .maybeSingle();

  if (error || !data) {
    return [];
  }

  const recordedAt = data.created_at || new Date().toISOString();
  const vitalsData = data.vitals_data || data.kiosk_data?.vitals || {};
  const observations: InternalVitalOrSymptom[] = [];

  // Blood Pressure
  let sysBP: number | undefined;
  let diaBP: number | undefined;

  if (vitalsData.systolic != null && vitalsData.diastolic != null) {
    sysBP = Number(vitalsData.systolic);
    diaBP = Number(vitalsData.diastolic);
  } else if (vitalsData.blood_pressure) {
    const parts = String(vitalsData.blood_pressure).split("/");
    if (parts.length === 2) {
      sysBP = parseInt(parts[0], 10);
      diaBP = parseInt(parts[1], 10);
    }
  } else if (vitalsData.bloodPressure) {
    const parts = String(vitalsData.bloodPressure).split("/");
    if (parts.length === 2) {
      sysBP = parseInt(parts[0], 10);
      diaBP = parseInt(parts[1], 10);
    }
  }

  if (sysBP != null && !isNaN(sysBP) && diaBP != null && !isNaN(diaBP)) {
    observations.push({
      id: `${data.id}-bp`,
      patientId: String(data.id),
      type: "blood_pressure",
      recordedAt,
      systolic: sysBP,
      diastolic: diaBP,
      note: vitalsData.status ? `Status: ${vitalsData.status}` : undefined,
    });
  }

  // Heart Rate
  const hr = vitalsData.heartRate ?? vitalsData.heart_rate;
  if (hr != null && !isNaN(Number(hr))) {
    observations.push({
      id: `${data.id}-hr`,
      patientId: String(data.id),
      type: "heart_rate",
      recordedAt,
      heartRate: Number(hr),
    });
  }

  // SpO2
  const spo2 = vitalsData.spo2;
  if (spo2 != null && !isNaN(Number(spo2))) {
    observations.push({
      id: `${data.id}-spo2`,
      patientId: String(data.id),
      type: "spo2",
      recordedAt,
      spo2: Number(spo2),
    });
  }

  // Symptoms
  if (data.symptoms && data.symptoms !== "Pending AI Symptom Evaluation") {
    observations.push({
      id: `${data.id}-sym`,
      patientId: String(data.id),
      type: "symptom",
      recordedAt,
      symptomText: data.symptoms,
    });
  }

  return observations;
}

export async function searchVitalsByPatient(
  patientId: string
): Promise<InternalVitalOrSymptom[]> {
  return getObservationsByPatientId(patientId);
}

export async function getAllObservations(): Promise<InternalVitalOrSymptom[]> {
  try {
    const patients = await getAllPatients();
    const allObs = await Promise.all(
      patients.map((p) => getObservationsByPatientId(p.id))
    );
    return allObs.flat();
  } catch (err) {
    console.error("Error fetching all observations:", err);
    return [];
  }
}

export async function createObservation(
  entry: Omit<InternalVitalOrSymptom, "id">
): Promise<InternalVitalOrSymptom> {
  const supabase = getSupabase();

  const { data: record, error: fetchErr } = await supabase
    .from("patient_records")
    .select("*")
    .eq("id", entry.patientId)
    .maybeSingle();

  if (fetchErr || !record) {
    throw new Error(`Patient with ID "${entry.patientId}" not found in patient_records`);
  }

  const existingVitals = record.vitals_data || record.kiosk_data?.vitals || {};
  const updatedVitals = { ...existingVitals };

  if (entry.type === "blood_pressure") {
    updatedVitals.systolic = entry.systolic;
    updatedVitals.diastolic = entry.diastolic;
    updatedVitals.blood_pressure = `${entry.systolic}/${entry.diastolic}`;
    updatedVitals.bloodPressure = `${entry.systolic}/${entry.diastolic}`;
  } else if (entry.type === "heart_rate") {
    updatedVitals.heartRate = entry.heartRate;
    updatedVitals.heart_rate = entry.heartRate;
  } else if (entry.type === "spo2") {
    updatedVitals.spo2 = entry.spo2;
  }

  let updatedSymptoms = record.symptoms;
  if (entry.type === "symptom" && entry.symptomText) {
    updatedSymptoms = entry.symptomText;
  }

  const { error: updateErr } = await supabase
    .from("patient_records")
    .update({
      vitals_data: updatedVitals,
      symptoms: updatedSymptoms,
    })
    .eq("id", entry.patientId);

  if (updateErr) {
    throw new Error(`Failed to update vitals_data on patient_records: ${updateErr.message}`);
  }

  const newId = `${entry.patientId}-${entry.type}-${Date.now()}`;
  return {
    ...entry,
    id: newId,
  };
}

export async function createVitalOrSymptom(
  entry: Omit<InternalVitalOrSymptom, "id">
): Promise<InternalVitalOrSymptom> {
  return createObservation(entry);
}

export async function getReportById(
  id: string
): Promise<InternalReport | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("patient_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const triage = data.kiosk_data?.triage;
  return {
    id: String(data.id),
    patientId: String(data.id),
    title: triage?.department ? `${triage.department} Diagnostic Summary` : "Clinical Summary",
    summary: triage?.summary || data.symptoms,
    conclusion: triage?.clinical_summary || "Evaluation completed",
    createdAt: data.created_at || new Date().toISOString(),
    status: "final",
  };
}

export async function searchReportsByPatient(
  patientId: string
): Promise<InternalReport[]> {
  const report = await getReportById(patientId);
  return report ? [report] : [];
}

export async function getCarePlanById(
  id: string
): Promise<InternalCarePlan | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("patient_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const triage = data.kiosk_data?.triage;
  return {
    id: String(data.id),
    patientId: String(data.id),
    title: `Care Plan for ${data.patient_name || "Patient"}`,
    goals: [triage?.department ? `Consult with ${triage.department}` : "Follow up with attending physician"],
    activities: [triage?.summary ? `Review summary: ${triage.summary}` : "Monitor vitals"],
    status: "active",
    createdAt: data.created_at || new Date().toISOString(),
  };
}

export async function searchCarePlansByPatient(
  patientId: string
): Promise<InternalCarePlan[]> {
  const plan = await getCarePlanById(patientId);
  return plan ? [plan] : [];
}
