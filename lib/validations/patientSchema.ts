import { z } from 'zod';

export const COUNTRY_PHONE_CONFIG: Record<
  string,
  { name: string; digits: number; flag: string; pattern: RegExp }
> = {
  '+91': { name: 'India', digits: 10, flag: '🇮🇳', pattern: /^[6-9]\d{9}$/ },
  '+1': { name: 'USA / Canada', digits: 10, flag: '🇺🇸', pattern: /^[2-9]\d{9}$/ },
  '+44': { name: 'United Kingdom', digits: 10, flag: '🇬🇧', pattern: /^7\d{9}$/ },
  '+971': { name: 'UAE', digits: 9, flag: '🇦🇪', pattern: /^5\d{8}$/ },
  '+61': { name: 'Australia', digits: 9, flag: '🇦🇺', pattern: /^4\d{8}$/ },
  '+65': { name: 'Singapore', digits: 8, flag: '🇸🇬', pattern: /^[89]\d{7}$/ },
  '+49': { name: 'Germany', digits: 10, flag: '🇩🇪', pattern: /^1\d{9}$/ },
};

export const cleanPhoneNumber = (rawInput: string, countryCode: string): string => {
  if (!rawInput) return '';
  let cleaned = rawInput.replace(/\D/g, ''); // remove non-digits
  const codeDigits = countryCode ? countryCode.replace(/\D/g, '') : ''; // e.g. "91"
  if (codeDigits && cleaned.startsWith(codeDigits) && cleaned.length > codeDigits.length) {
    cleaned = cleaned.slice(codeDigits.length);
  }
  return cleaned;
};

export const patientSchema = z
  .object({
    fullName: z
      .string()
      .min(2, { message: 'Full Name must be at least 2 characters long' }),
    age: z
      .coerce
      .number()
      .min(1, { message: 'Age must be at least 1 year' })
      .max(120, { message: 'Age cannot exceed 120 years' }),
    gender: z
      .enum(['Male', 'Female', 'Intersex', 'Other'], {
        message: 'Please select a valid sex / gender',
      }),
    countryCode: z.string().default('+91'),
    phoneNumber: z.string().min(1, { message: 'Phone number is required' }),
    emergencyCountryCode: z.string().default('+91'),
    emergencyContact: z
      .string()
      .min(1, { message: 'Emergency Contact Number is required before proceeding.' }),
    appointmentDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate Primary Phone
    const config =
      COUNTRY_PHONE_CONFIG[data.countryCode] || COUNTRY_PHONE_CONFIG['+91'];
    const cleanPhone = cleanPhoneNumber(data.phoneNumber, data.countryCode);

    if (cleanPhone.length !== config.digits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phoneNumber'],
        message: `Enter a valid ${config.digits}-digit mobile number for ${config.name} (${data.countryCode})`,
      });
    } else if (!config.pattern.test(cleanPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phoneNumber'],
        message: `Invalid phone format for ${config.name} (${data.countryCode})`,
      });
    }

    // Validate Mandatory Emergency Contact Phone
    const emConfig =
      COUNTRY_PHONE_CONFIG[data.emergencyCountryCode] ||
      COUNTRY_PHONE_CONFIG['+91'];
    const cleanEmPhone = cleanPhoneNumber(
      data.emergencyContact || '',
      data.emergencyCountryCode
    );

    if (!cleanEmPhone || cleanEmPhone.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['emergencyContact'],
        message: 'Emergency Contact Number is required before proceeding.',
      });
    } else if (cleanEmPhone.length !== emConfig.digits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['emergencyContact'],
        message: `Emergency contact requires ${emConfig.digits} digits for ${emConfig.name} (${data.emergencyCountryCode})`,
      });
    } else if (!emConfig.pattern.test(cleanEmPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['emergencyContact'],
        message: `Invalid emergency phone format for ${emConfig.name} (${data.emergencyCountryCode})`,
      });
    }
  });

export type FollowUpStatus = 'Pending' | 'In Progress' | 'Completed' | 'Requires Attention';

export const patientInfoSchema = patientSchema;
export type PatientSchemaType = z.infer<typeof patientSchema>;

