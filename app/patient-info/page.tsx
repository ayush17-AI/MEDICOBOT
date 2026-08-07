// Server Component: Route-level entry point for /patient-info
// This file MUST be a Server Component (no 'use client') so that
// `export const dynamic` is respected by Next.js App Router.
export const dynamic = 'force-dynamic';

import PatientInfoClient from './client';

export default function PatientInfoPage() {
  return <PatientInfoClient />;
}
