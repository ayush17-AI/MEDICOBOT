// Server Component: Route-level entry point for /vitals-dashboard
// MUST be a Server Component so `export const dynamic` is respected by Next.js App Router.
export const dynamic = 'force-dynamic';

import VitalsDashboardClient from './client';

export default function VitalsDashboardPage() {
  return <VitalsDashboardClient />;
}
