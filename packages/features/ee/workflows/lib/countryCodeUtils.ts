export interface CountryOption {
  label: string;
  value: string;
  dialCode: string;
}

const countryData: Record<string, { name: string; dialCode: string }> = {
  us: { name: "United States", dialCode: "1" },
  ca: { name: "Canada", dialCode: "1" },
  gb: { name: "United Kingdom", dialCode: "44" },
  de: { name: "Germany", dialCode: "49" },
  fr: { name: "France", dialCode: "33" },
  au: { name: "Australia", dialCode: "61" },
  in: { name: "India", dialCode: "91" },
  jp: { name: "Japan", dialCode: "81" },
  br: { name: "Brazil", dialCode: "55" },
  mx: { name: "Mexico", dialCode: "52" },
  it: { name: "Italy", dialCode: "39" },
  es: { name: "Spain", dialCode: "34" },
  nl: { name: "Netherlands", dialCode: "31" },
  se: { name: "Sweden", dialCode: "46" },
  no: { name: "Norway", dialCode: "47" },
  dk: { name: "Denmark", dialCode: "45" },
  fi: { name: "Finland", dialCode: "358" },
  ch: { name: "Switzerland", dialCode: "41" },
  at: { name: "Austria", dialCode: "43" },
  be: { name: "Belgium", dialCode: "32" },
};

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
