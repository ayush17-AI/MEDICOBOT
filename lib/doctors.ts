import type { Department, Doctor } from "./types";

// Demo dataset. Swap for a real query (Supabase, etc.) when wired up —
// the scoring function below is what actually matters for Phase 4.
export const DOCTORS: Doctor[] = [
  { id: "d1", name: "Dr. Anjali Rao", department: "Cardiology", rating: 4.8, waitTimeMins: 12, photoInitials: "AR" },
  { id: "d2", name: "Dr. Vikram Shah", department: "Cardiology", rating: 4.5, waitTimeMins: 25, photoInitials: "VS" },
  { id: "d3", name: "Dr. Neha Kapoor", department: "Gastroenterology", rating: 4.6, waitTimeMins: 18, photoInitials: "NK" },
  { id: "d4", name: "Dr. Sameer Joshi", department: "Gastroenterology", rating: 4.2, waitTimeMins: 8, photoInitials: "SJ" },
  { id: "d5", name: "Dr. Priya Menon", department: "General Physician", rating: 4.7, waitTimeMins: 6, photoInitials: "PM" },
  { id: "d6", name: "Dr. Arjun Nair", department: "General Physician", rating: 4.3, waitTimeMins: 15, photoInitials: "AN" },
  { id: "d7", name: "Dr. Kavita Iyer", department: "Neurology", rating: 4.9, waitTimeMins: 30, photoInitials: "KI" },
  { id: "d8", name: "Dr. Rohan Verma", department: "Neurology", rating: 4.4, waitTimeMins: 14, photoInitials: "RV" },
  { id: "d9", name: "Dr. Fatima Sheikh", department: "Orthopedics", rating: 4.6, waitTimeMins: 10, photoInitials: "FS" },
  { id: "d10", name: "Dr. Karan Malhotra", department: "Orthopedics", rating: 4.1, waitTimeMins: 22, photoInitials: "KM" },
];

export function doctorsForDepartment(dept: Department): Doctor[] {
  return DOCTORS.filter((d) => d.department === dept);
}

/** Score = (Rating × 0.6) + ((60 − WaitTimeMins) × 0.4), per PRD Phase 4B. */
export function scoreDoctor(d: Doctor): number {
  return d.rating * 0.6 + (60 - d.waitTimeMins) * 0.4;
}

export function rankDoctors(dept: Department): (Doctor & { score: number })[] {
  return doctorsForDepartment(dept)
    .map((d) => ({ ...d, score: scoreDoctor(d) }))
    .sort((a, b) => b.score - a.score);
}
