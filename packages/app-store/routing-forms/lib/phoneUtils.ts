export const normalizeCountryCode = (countryCode?: string | null) => {
  const trimmed = countryCode?.trim();
  if (!trimmed) return null;

  const stripped = trimmed.replace(/\s+/g, "");
  const normalized = stripped.startsWith("+") ? stripped : `+${stripped}`;
  if (!/^\+\d+$/.test(normalized)) return null;

  return normalized;
};

export const applyDefaultCountryCodeToPhoneValue = ({
  value,
  defaultCountryCode,
}: {
  value: string;
  defaultCountryCode?: string | null;
}) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return trimmedValue;
  if (trimmedValue.startsWith("+")) return trimmedValue;

  const normalizedCountryCode = normalizeCountryCode(defaultCountryCode);
  if (!normalizedCountryCode) return trimmedValue;

  return `${normalizedCountryCode}${trimmedValue}`;
};
