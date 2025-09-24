import { getCountries, getCountryCallingCode } from "libphonenumber-js";

export interface CountryOption {
  label: string;
  value: string;
  dialCode: string;
  flag?: string;
}

const generateCountryData = (): Record<string, { name: string; dialCode: string }> => {
  const countryData: Record<string, { name: string; dialCode: string }> = {};
  const intl = new Intl.DisplayNames(["en"], { type: "region" });

  const supportedCountries = getCountries();

  supportedCountries.forEach((code) => {
    try {
      const dialCode = getCountryCallingCode(code);
      const name = intl.of(code) || code;
      countryData[code.toLowerCase()] = { name, dialCode };
    } catch (e) {
      console.error(`Failed to generate country data for ${code}: ${e}`);
    }
  });

  return countryData;
};

const countryData = generateCountryData();

export const getCountryOptions = (): CountryOption[] => {
  return Object.entries(countryData).map(([countryCode, data]) => ({
    label: `${data.name} (+${data.dialCode})`,
    value: countryCode.toUpperCase(),
    dialCode: data.dialCode,
  }));
};

export const getCountryLabel = (countryCode: string): string => {
  const country = countryData[countryCode.toLowerCase()];
  if (!country) return countryCode;
  return `${country.name} (+${country.dialCode})`;
};

export const getCountriesWithSameDialCode = (countryCodes: string[]): string[] => {
  const dialCodes = new Set<string>();
  const result = new Set<string>();

  countryCodes.forEach((code) => {
    const country = countryData[code.toLowerCase()];
    if (country) {
      dialCodes.add(country.dialCode);
    }
  });

  Object.entries(countryData).forEach(([countryCode, data]) => {
    if (dialCodes.has(data.dialCode)) {
      result.add(countryCode.toUpperCase());
    }
  });

  return Array.from(result);
};

export const shouldPreventCountryCodeDeletion = (allowedCountryCodes: string[]): boolean => {
  if (!allowedCountryCodes || allowedCountryCodes.length === 0) return false;

  const dialCodes = new Set<string>();
  allowedCountryCodes.forEach((code) => {
    const country = countryData[code.toLowerCase()];
    if (country) {
      dialCodes.add(country.dialCode);
    }
  });

  return dialCodes.size === 1;
};
