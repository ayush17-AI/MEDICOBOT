export const TRIAGE_LEGAL_DISCLAIMER = 
  "Legal Disclaimer: This AI-assisted clinical triage score and recommendation are intended solely as decision-support tools for qualified healthcare professionals. They do not constitute a final medical diagnosis, prescription, or emergency directive. Clinical judgment by a certified physician supersedes all automated outputs.";

export function attachDisclaimerToPayload<T extends Record<string, any>>(data: T) {
  return {
    ...data,
    meta: {
      ...(data.meta || {}),
      legal_disclaimer: TRIAGE_LEGAL_DISCLAIMER,
      timestamp: new Date().toISOString(),
    },
  };
}
