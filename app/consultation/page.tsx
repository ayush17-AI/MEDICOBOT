// Server Component: Route-level entry point for /consultation
export const dynamic = 'force-dynamic';

import ConsultationClient from './client';

export default function ConsultationPage() {
  return <ConsultationClient />;
}
