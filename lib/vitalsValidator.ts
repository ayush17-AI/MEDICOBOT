export interface VitalsData {
  temp: number; // °F
  heartRate: number; // BPM
  spo2: number; // %
  sysBP: number; // mmHg
  diaBP: number; // mmHg
}

export interface VitalMetricResult {
  value: number | string;
  unit: string;
  status: 'normal' | 'mild' | 'anomaly';
  message: string;
}

export interface VitalsValidationResult {
  temp: VitalMetricResult;
  heartRate: VitalMetricResult;
  spo2: VitalMetricResult;
  bp: VitalMetricResult;
  hasAnomaly: boolean;
  hasMild: boolean;
  overallStatus: 'normal' | 'mild' | 'anomaly';
  alertMessage: string | null;
}

/**
 * Validates human biological vitals against clinical reference ranges.
 * Flagged anomalies (> 106°F temp, < 50% SpO2, < 40 BPM heart rate, etc.)
 * block analysis progression and request a sensor re-read.
 */
export function validateVitals(vitals: VitalsData): VitalsValidationResult {
  const { temp, heartRate, spo2, sysBP, diaBP } = vitals;

  // 1. Temperature Validation (°F)
  let tempResult: VitalMetricResult;
  if (temp > 106.0 || temp < 92.0) {
    tempResult = {
      value: temp,
      unit: '°F',
      status: 'anomaly',
      message: `Extreme Temperature Anomaly (${temp}°F). Out of human physiological bounds.`,
    };
  } else if ((temp >= 99.6 && temp <= 105.9) || (temp >= 93.0 && temp <= 96.9)) {
    tempResult = {
      value: temp,
      unit: '°F',
      status: 'mild',
      message: temp >= 99.6 ? `Elevated Body Temp (${temp}°F)` : `Hypothermia Warning (${temp}°F)`,
    };
  } else {
    tempResult = {
      value: temp,
      unit: '°F',
      status: 'normal',
      message: 'Normal Body Temperature',
    };
  }

  // 2. Heart Rate / Pulse Validation (BPM)
  let hrResult: VitalMetricResult;
  if (heartRate > 180 || heartRate < 40) {
    hrResult = {
      value: heartRate,
      unit: 'BPM',
      status: 'anomaly',
      message: `Extreme Heart Rate Anomaly (${heartRate} BPM). Check sensor placement.`,
    };
  } else if ((heartRate >= 101 && heartRate <= 179) || (heartRate >= 41 && heartRate <= 59)) {
    hrResult = {
      value: heartRate,
      unit: 'BPM',
      status: 'mild',
      message: heartRate >= 101 ? `Tachycardia (${heartRate} BPM)` : `Bradycardia (${heartRate} BPM)`,
    };
  } else {
    hrResult = {
      value: heartRate,
      unit: 'BPM',
      status: 'normal',
      message: 'Normal Resting Heart Rate',
    };
  }

  // 3. SpO2 Level Validation (%)
  let spo2Result: VitalMetricResult;
  if (spo2 > 100 || spo2 < 50) {
    spo2Result = {
      value: spo2,
      unit: '%',
      status: 'anomaly',
      message: `Impossible SpO2 Reading (${spo2}%). Re-attach pulse oximeter probe.`,
    };
  } else if (spo2 >= 90 && spo2 <= 94) {
    spo2Result = {
      value: spo2,
      unit: '%',
      status: 'mild',
      message: `Mild Hypoxia (${spo2}% SpO2)`,
    };
  } else {
    spo2Result = {
      value: spo2,
      unit: '%',
      status: 'normal',
      message: 'Normal Oxygen Saturation',
    };
  }

  // 4. Blood Pressure Validation (mmHg)
  let bpResult: VitalMetricResult;
  if (sysBP > 200 || sysBP < 60 || diaBP > 120 || diaBP < 40) {
    bpResult = {
      value: `${sysBP}/${diaBP}`,
      unit: 'mmHg',
      status: 'anomaly',
      message: `Critical Blood Pressure Out-Of-Bounds (${sysBP}/${diaBP} mmHg).`,
    };
  } else if (sysBP >= 130 || diaBP >= 85) {
    bpResult = {
      value: `${sysBP}/${diaBP}`,
      unit: 'mmHg',
      status: 'mild',
      message: `Prehypertension / Stage 1 High BP (${sysBP}/${diaBP} mmHg)`,
    };
  } else {
    bpResult = {
      value: `${sysBP}/${diaBP}`,
      unit: 'mmHg',
      status: 'normal',
      message: 'Normal Blood Pressure',
    };
  }

  const hasAnomaly =
    tempResult.status === 'anomaly' ||
    hrResult.status === 'anomaly' ||
    spo2Result.status === 'anomaly' ||
    bpResult.status === 'anomaly';

  const hasMild =
    tempResult.status === 'mild' ||
    hrResult.status === 'mild' ||
    spo2Result.status === 'mild' ||
    bpResult.status === 'mild';

  let overallStatus: 'normal' | 'mild' | 'anomaly' = 'normal';
  if (hasAnomaly) overallStatus = 'anomaly';
  else if (hasMild) overallStatus = 'mild';

  const alertMessage = hasAnomaly
    ? "Sensor Reading Anomaly Detected! Please re-attach the sensor and click 'Re-Read Sensor Data'."
    : null;

  return {
    temp: tempResult,
    heartRate: hrResult,
    spo2: spo2Result,
    bp: bpResult,
    hasAnomaly,
    hasMild,
    overallStatus,
    alertMessage,
  };
}
