export const currencyOptions = [
  { label: "United States Dollar", value: "USD" },
  { label: "Australian Dollar", value: "AUD" },
  { label: "Brazilian Real", value: "BRL" },
  { label: "Canadian Dollar", value: "CAD" },
  { label: "Chinese Renminbi", value: "CNY" },
  { label: "Czech Koruna", value: "CZK" },
  { label: "Danish Krone", value: "DKK" },
  { label: "Euro", value: "EUR" },
  { label: "Hong Kong Dollar", value: "HKD" },
  { label: "Hungarian Forint", value: "HUF" },
  { label: "Israeli New Shekel", value: "ILS" },
  { label: "Japanese Yen", value: "JPY" },
  { label: "Malaysian Ringgit", value: "MYR" },
  { label: "Mexican Peso", value: "MXN" },
  { label: "New Taiwan Dollar", value: "TWD" },
  { label: "New Zealand Dollar", value: "NZD" },
  { label: "Norwegian Krone", value: "NOK" },
  { label: "Philippine Peso", value: "PHP" },
  { label: "Polish Złoty", value: "PLN" },
  { label: "Pound Sterling", value: "GBP" },
  { label: "Singapore Dollar", value: "SGD" },
  { label: "Swedish Krona", value: "SEK" },
  { label: "Swiss Franc", value: "CHF" },
  { label: "Thai Baht", value: "THB" },
] as const;

type CurrencyCode = (typeof currencyOptions)[number]["value"];

export const currencySymbols: Record<CurrencyCode, string> = {
  USD: "$",
  AUD: "$",
  BRL: "R$",
  CAD: "$",
  CNY: "¥",
  CZK: "Kč",
  DKK: "kr",
  EUR: "€",
  HKD: "$",
  HUF: "Ft",
  ILS: "₪",
  JPY: "¥",
  MYR: "RM",
  MXN: "$",
  TWD: "$",
  NZD: "$",
  NOK: "kr",
  PHP: "₱",
  PLN: "zł",
  GBP: "£",
  SGD: "$",
  SEK: "kr",
  CHF: "Fr",
  THB: "฿",
};

export function isAcceptedCurrencyCode(currencyCode: string): currencyCode is CurrencyCode {
  return Object.keys(currencySymbols).includes(currencyCode);
}
