import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId, prescriptionText, transcriptionSource, fulfillInHousePharmacy } = body;

    if (!patientId || !prescriptionText) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: patientId and prescriptionText are mandatory.' },
        { status: 400 }
      );
    }

    // Sanitize prescription input
    const sanitizedText = prescriptionText.trim();

    // Map into FHIR MedicationRequest payload structure
    const fhirMedicationRequest = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      subject: { reference: `Patient/${patientId}` },
      dosageInstruction: [{ text: sanitizedText }],
      authoredOn: new Date().toISOString(),
      extension: [
        {
          url: 'https://medicobot.org/fhir/StructureDefinition/transcription-source',
          valueString: transcriptionSource || 'manual_input',
        },
      ],
    };

    console.log('[PRESCRIPTION DISPATCHED]', {
      patientId,
      source: transcriptionSource,
      fulfillPharmacy: fulfillInHousePharmacy,
      fhir: fhirMedicationRequest,
    });

    return NextResponse.json({
      success: true,
      message: 'Prescription processed and dispatch queued successfully',
      dispatchId: `disp_${Date.now()}`,
      metadata: {
        patientId,
        transcriptionSource: transcriptionSource || 'manual_input',
        fulfillInHousePharmacy: Boolean(fulfillInHousePharmacy),
      },
      fhirResource: fhirMedicationRequest,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[DISPATCH API ERR]', error);
    return NextResponse.json({ success: false, error: error.message || 'Dispatch processing failed' }, { status: 500 });
  }
}
