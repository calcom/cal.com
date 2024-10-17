const currencies = {
  AR: "ARS",
  AU: "AUD",
  BR: "BRL",
  CA: "CAD",
  CH: "CHF",
  CN: "CNY",
  CZ: "CZK",
  DK: "DKK",
  GB: "GBP",
  HK: "HKD",
  HR: "HRK",
  HU: "HUN",
  ID: "IDR",
  IN: "INR",
  JP: "JPY",
  KR: "KRW",
  MG: "MGA",
  MX: "MXN",
  MY: "MYR",
  NO: "NOK",
  NZ: "NZD",
  PH: "PHP",
  PL: "PLN",
  RO: "RON",
  RU: "RUB",
  SE: "SEK",
  SG: "SGD",
  SK: "SKK",
  TH: "THB",
  TW: "TWD",
  US: "USD",
  VN: "VND",
  LA: "LAK",
  RS: "RSD",
  default: "EUR",
};

const getCurrency = (countryCode: string) => currencies[countryCode] || currencies.default;

function parseAmount(amount: string, countryCode: string) {
  return {
    value: Number(amount),
    currency: getCurrency(countryCode),
  };
}

export { parseAmount };
