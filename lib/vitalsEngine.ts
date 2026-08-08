export interface VitalsInput {
  temperature: number; // °F
  heartRate: number;   // BPM
  spo2: number;        // %
  sysBP: number;       // mmHg
  diaBP: number;       // mmHg
}

export type VitalsStatus = 'NORMAL' | 'MEDIUM' | 'SEVERE' | 'INVALID';

export interface VitalsEvalResult {
  temperature: { value: number; unit: string; status: VitalsStatus; message: string };
  heartRate: { value: number; unit: string; status: VitalsStatus; message: string };
  spo2: { value: number; unit: string; status: VitalsStatus; message: string };
  bp: { value: string; unit: string; status: VitalsStatus; message: string };
  overallStatus: VitalsStatus;
  isAnomaly: boolean;
  alertMessage: string | null;
}

/**
 * Vitals Biological Anomaly & Medical Threshold Engine:
 * Evaluates human biological vitals against clinical reference ranges.
 *
 * 1. BODY TEMPERATURE (°F):
 *    < 90.0°F or > 108.0°F: INVALID ➔ "⚠️ Invalid Biological Reading (Out of Human Bounds)"
 *    95.0°F - 99.0°F: NORMAL ➔ "✓ Normal Body Temperature"
 *    99.1°F - 102.0°F: MEDIUM ➔ "⚠️ Mild / Moderate Fever"
 *    102.1°F - 108.0°F: SEVERE ➔ "🚨 High / Critical Fever"
 *
 * 2. HEART RATE (BPM):
 *    < 30 BPM or > 220 BPM: INVALID ➔ "⚠️ Invalid Reading"
 *    60 - 100 BPM: NORMAL ➔ "✓ Normal Resting Heart Rate"
 *    50 - 59 BPM or 101 - 120 BPM: MEDIUM ➔ "⚠️ Mild Bradycardia / Tachycardia"
 *    < 50 BPM or > 120 BPM: SEVERE ➔ "🚨 Critical Heart Rate Anomaly"
 *
 * 3. SPO2 OXYGEN (%):
 *    < 50% or > 100%: INVALID ➔ "⚠️ Invalid Sensor Value"
 *    95% - 100%: NORMAL ➔ "✓ Normal Oxygen Saturation"
 *    90% - 94%: MEDIUM ➔ "⚠️ Moderate Hypoxia Warning"
 *    < 90%: SEVERE ➔ "🚨 Critical Hypoxemia Emergency"
 *
 * 4. BLOOD PRESSURE (MMHG):
 *    Systolic < 70 / > 240 OR Diastolic < 40 / > 140: INVALID ➔ "⚠️ Invalid BP Reading"
 *    Systolic 90-120 AND Diastolic 60-80: NORMAL ➔ "✓ Normal Blood Pressure"
 *    Systolic 121-139 OR Diastolic 81-89: MEDIUM ➔ "⚠️ Prehypertension / Elevated BP"
 *    Systolic >= 140 OR Diastolic >= 90: SEVERE ➔ "🚨 Critical Hypertension Risk"
 */
export function evaluateVitalsEngine(vitals: VitalsInput): VitalsEvalResult {
  const { temperature, heartRate, spo2, sysBP, diaBP } = vitals;

  // 1. Temperature Evaluation (°F)
  let tempStatus: VitalsStatus = 'NORMAL';
  let tempMsg = '✓ Normal Body Temperature';
  if (temperature < 90.0 || temperature > 108.0) {
    tempStatus = 'INVALID';
    tempMsg = '⚠️ Invalid Biological Reading (Out of Human Bounds)';
  } else if (temperature >= 102.1 && temperature <= 108.0) {
    tempStatus = 'SEVERE';
    tempMsg = '🚨 High / Critical Fever';
  } else if (temperature >= 99.1 && temperature <= 102.0) {
    tempStatus = 'MEDIUM';
    tempMsg = '⚠️ Mild / Moderate Fever';
  } else if (temperature >= 95.0 && temperature <= 99.0) {
    tempStatus = 'NORMAL';
    tempMsg = '✓ Normal Body Temperature';
  } else {
    // 90.0 - 94.9 (Hypothermia) or edge cases
    tempStatus = 'MEDIUM';
    tempMsg = `⚠️ Hypothermia / Low Body Temp (${temperature}°F)`;
  }

  // 2. Heart Rate Evaluation (BPM)
  let hrStatus: VitalsStatus = 'NORMAL';
  let hrMsg = '✓ Normal Resting Heart Rate';
  if (heartRate < 30 || heartRate > 220) {
    hrStatus = 'INVALID';
    hrMsg = '⚠️ Invalid Reading';
  } else if (heartRate < 50 || heartRate > 120) {
    hrStatus = 'SEVERE';
    hrMsg = '🚨 Critical Heart Rate Anomaly';
  } else if ((heartRate >= 50 && heartRate <= 59) || (heartRate >= 101 && heartRate <= 120)) {
    hrStatus = 'MEDIUM';
    hrMsg = '⚠️ Mild Bradycardia / Tachycardia';
  } else {
    hrStatus = 'NORMAL';
    hrMsg = '✓ Normal Resting Heart Rate';
  }

  // 3. SpO2 Evaluation (%)
  let spo2Status: VitalsStatus = 'NORMAL';
  let spo2Msg = '✓ Normal Oxygen Saturation';
  if (spo2 < 50 || spo2 > 100) {
    spo2Status = 'INVALID';
    spo2Msg = '⚠️ Invalid Sensor Value';
  } else if (spo2 < 90) {
    spo2Status = 'SEVERE';
    spo2Msg = '🚨 Critical Hypoxemia Emergency';
  } else if (spo2 >= 90 && spo2 <= 94) {
    spo2Status = 'MEDIUM';
    spo2Msg = '⚠️ Moderate Hypoxia Warning';
  } else {
    spo2Status = 'NORMAL';
    spo2Msg = '✓ Normal Oxygen Saturation';
  }

  // 4. Blood Pressure Evaluation (mmHg)
  let bpStatus: VitalsStatus = 'NORMAL';
  let bpMsg = '✓ Normal Blood Pressure';
  if (sysBP < 70 || sysBP > 240 || diaBP < 40 || diaBP > 140) {
    bpStatus = 'INVALID';
    bpMsg = '⚠️ Invalid BP Reading';
  } else if (sysBP >= 140 || diaBP >= 90) {
    bpStatus = 'SEVERE';
    bpMsg = '🚨 Critical Hypertension Risk';
  } else if ((sysBP >= 121 && sysBP <= 139) || (diaBP >= 81 && diaBP <= 89)) {
    bpStatus = 'MEDIUM';
    bpMsg = '⚠️ Prehypertension / Elevated BP';
  } else {
    bpStatus = 'NORMAL';
    bpMsg = '✓ Normal Blood Pressure';
  }

  const isAnomaly =
    tempStatus === 'INVALID' ||
    hrStatus === 'INVALID' ||
    spo2Status === 'INVALID' ||
    bpStatus === 'INVALID';

  const isSevere =
    tempStatus === 'SEVERE' ||
    hrStatus === 'SEVERE' ||
    spo2Status === 'SEVERE' ||
    bpStatus === 'SEVERE';

  const isMedium =
    tempStatus === 'MEDIUM' ||
    hrStatus === 'MEDIUM' ||
    spo2Status === 'MEDIUM' ||
    bpStatus === 'MEDIUM';

  let overallStatus: VitalsStatus = 'NORMAL';
  if (isAnomaly) overallStatus = 'INVALID';
  else if (isSevere) overallStatus = 'SEVERE';
  else if (isMedium) overallStatus = 'MEDIUM';

  const alertMessage = isAnomaly
    ? 'Invalid Biological Reading Detected (Out of Human Bounds). Please re-enter/re-read vitals.'
    : null;

  return {
    temperature: { value: temperature, unit: '°F', status: tempStatus, message: tempMsg },
    heartRate: { value: heartRate, unit: 'BPM', status: hrStatus, message: hrMsg },
    spo2: { value: spo2, unit: '%', status: spo2Status, message: spo2Msg },
    bp: { value: `${sysBP}/${diaBP}`, unit: 'mmHg', status: bpStatus, message: bpMsg },
    overallStatus,
    isAnomaly,
    alertMessage,
  };
}
