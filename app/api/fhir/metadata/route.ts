import { NextResponse } from "next/server";
import { buildCapabilityStatement } from "@/fhir/capabilityStatement";

export async function GET() {
  return NextResponse.json(buildCapabilityStatement(), {
    status: 200,
    headers: { "Content-Type": "application/fhir+json" },
  });
}
