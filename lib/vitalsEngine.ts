export interface VitalsInput {
  temperature: number; // °F
  heartRate: number;   // BPM
  spo2: number;        // %
  sysBP: number;       // mmHg
  diaBP: number;       // mmHg
}

export type VitalsStatus = 'NORMAL' | 'MILD_ABNORMAL' | 'ANOMALY_ERROR';

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
 * Vitals Biological Anomaly & Threshold Engine:
 * Evaluates vitals against physiological bounds.
 * Normal: Temp 97-99.5°F, SpO2 95-100%, HR 60-100 BPM
 * Sick / Mild: Temp 99.6-104.9°F, SpO2 90-94%, HR 101-180 BPM
 * Anomaly Error: Temp > 105°F (e.g. 110°F) or < 92°F, SpO2 < 50% or > 100%, HR > 180 BPM or < 35 BPM
 */
export function evaluateVitalsEngine(vitals: VitalsInput): VitalsEvalResult {
  const { temperature, heartRate, spo2, sysBP, diaBP } = vitals;

  // Temperature Evaluation (°F)
  let tempStatus: VitalsStatus = 'NORMAL';
  let tempMsg = 'Normal Body Temperature';
  if (temperature > 105.0 || temperature < 92.0) {
    tempStatus = 'ANOMALY_ERROR';
    tempMsg = `Extreme Temperature Anomaly (${temperature}°F)`;
  } else if (temperature >= 99.6 || temperature <= 96.9) {
    tempStatus = 'MILD_ABNORMAL';
    tempMsg = temperature >= 99.6 ? `Elevated Fever (${temperature}°F)` : `Low Body Temp (${temperature}°F)`;
  }

  // Heart Rate Evaluation (BPM)
  let hrStatus: VitalsStatus = 'NORMAL';
  let hrMsg = 'Normal Heart Rate';
  if (heartRate > 180 || heartRate < 35) {
    hrStatus = 'ANOMALY_ERROR';
    hrMsg = `Extreme Heart Rate Anomaly (${heartRate} BPM)`;
  } else if (heartRate > 100 || heartRate < 60) {
    hrStatus = 'MILD_ABNORMAL';
    hrMsg = heartRate > 100 ? `Tachycardia (${heartRate} BPM)` : `Bradycardia (${heartRate} BPM)`;
  }

  // SpO2 Evaluation (%)
  let spo2Status: VitalsStatus = 'NORMAL';
  let spo2Msg = 'Normal Oxygen Saturation';
  if (spo2 > 100 || spo2 < 50) {
    spo2Status = 'ANOMALY_ERROR';
    spo2Msg = `Impossible SpO2 Reading (${spo2}%)`;
  } else if (spo2 < 95) {
    spo2Status = 'MILD_ABNORMAL';
    spo2Msg = `Low Oxygen Level (${spo2}%)`;
  }

  // Blood Pressure Evaluation (mmHg)
  let bpStatus: VitalsStatus = 'NORMAL';
  let bpMsg = 'Normal Blood Pressure';
  if (sysBP > 200 || sysBP < 60 || diaBP > 120 || diaBP < 40) {
    bpStatus = 'ANOMALY_ERROR';
    bpMsg = `Critical BP Reading (${sysBP}/${diaBP} mmHg)`;
  } else if (sysBP >= 130 || diaBP >= 85) {
    bpStatus = 'MILD_ABNORMAL';
    bpMsg = `High Blood Pressure (${sysBP}/${diaBP} mmHg)`;
  }

  const isAnomaly =
    tempStatus === 'ANOMALY_ERROR' ||
    hrStatus === 'ANOMALY_ERROR' ||
    spo2Status === 'ANOMALY_ERROR' ||
    bpStatus === 'ANOMALY_ERROR';

  const isMild =
    tempStatus === 'MILD_ABNORMAL' ||
    hrStatus === 'MILD_ABNORMAL' ||
    spo2Status === 'MILD_ABNORMAL' ||
    bpStatus === 'MILD_ABNORMAL';

  let overallStatus: VitalsStatus = 'NORMAL';
  if (isAnomaly) overallStatus = 'ANOMALY_ERROR';
  else if (isMild) overallStatus = 'MILD_ABNORMAL';

  const alertMessage = isAnomaly
    ? 'Humanly Impossible Reading Detected (Possible Hardware Error). Please re-enter/re-read vitals.'
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
