export interface CountryConfig {
  code: string;       // e.g. 'IN'
  name: string;       // e.g. 'India'
  dialCode: string;   // e.g. '+91'
  flag: string;       // e.g. '🇮🇳'
  digits: number;     // e.g. 10
  example: string;    // e.g. '9876543210'
  pattern: RegExp;    // Regex for numeric digits & length
}

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    flag: '🇮🇳',
    digits: 10,
    example: '9876543210',
    pattern: /^[6-9]\d{9}$/,
  },
  {
    code: 'US',
    name: 'United States / Canada',
    dialCode: '+1',
    flag: '🇺🇸',
    digits: 10,
    example: '2025550143',
    pattern: /^[2-9]\d{9}$/,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '🇬🇧',
    digits: 10,
    example: '7911123456',
    pattern: /^7\d{9}$/,
  },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    flag: '🇦🇺',
    digits: 9,
    example: '412345678',
    pattern: /^4\d{8}$/,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    flag: '🇦🇪',
    digits: 9,
    example: '501234567',
    pattern: /^5\d{8}$/,
  },
  {
    code: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    flag: '🇸🇬',
    digits: 8,
    example: '81234567',
    pattern: /^[89]\d{7}$/,
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    flag: '🇩🇪',
    digits: 10,
    example: '1512345678',
    pattern: /^1\d{9}$/,
  },
];

export interface PhoneValidationResult {
  isValid: boolean;
  message: string;
}

export function validatePhoneNumber(dialCode: string, mobileNumber: string): PhoneValidationResult {
  const cleanNumber = mobileNumber.replace(/\D/g, '');
  const country = SUPPORTED_COUNTRIES.find((c) => c.dialCode === dialCode) || SUPPORTED_COUNTRIES[0];

  if (!cleanNumber) {
    return {
      isValid: false,
      message: `Mobile number is required. Enter a valid ${country.digits}-digit number.`,
    };
  }

  if (cleanNumber.length !== country.digits) {
    return {
      isValid: false,
      message: `Enter a valid ${country.digits}-digit mobile number for ${country.name} (${country.dialCode}).`,
    };
  }

  if (!country.pattern.test(cleanNumber)) {
    return {
      isValid: false,
      message: `Invalid format for ${country.name} (${country.dialCode}). Example: ${country.example}`,
    };
  }

  return {
    isValid: true,
    message: 'Valid mobile number',
  };
}
