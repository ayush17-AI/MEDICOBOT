// Server Component: Route-level entry point for /symptoms
export const dynamic = 'force-dynamic';

import SymptomsClient from './client';

export default function SymptomsPage() {
  return <SymptomsClient />;
}
