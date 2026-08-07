// Server Component: Route-level entry point for /doctor-dashboard
// MUST be a Server Component so `export const dynamic` is respected by Next.js App Router.
export const dynamic = 'force-dynamic';

import DoctorDashboardClient from './client';

export default function DoctorDashboardPage() {
  return <DoctorDashboardClient />;
}
