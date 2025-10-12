export const currencyOptions = [
  { label: "SATS", value: "BTC", unit: "SATS" },
  { label: "USD- US Dollar", value: "USD", unit: "USD" },
  { label: "EUR- Euro", value: "EUR", unit: "EUR" },
  { label: "JPY- Japanese Yen", value: "JPY", unit: "JPY" },
  { label: "CNY- Yuan Renminbi", value: "CNY", unit: "CNY" },
  { label: "GBP- Pounds Sterling", value: "GBP", unit: "GBP" },
  { label: "AED- UAE Dirham", value: "AED", unit: "AED" },
  { label: "ZAR- South African Rand", value: "ZAR", unit: "ZAR" },
  { label: "HKD- Hong Kong Dollar", value: "HKD", unit: "HKD" },
  { label: "BRL- Brazilian Real", value: "BRL", unit: "BRL" },
  { label: "AUD- Australian Dollar", value: "AUD", unit: "AUD" },
  { label: "CAD- Canadian Dollar", value: "CAD", unit: "CAD" },
  { label: "CZK- Czech Koruna", value: "CZK", unit: "CZK" },
  { label: "DKK- Danish Krone", value: "DKK", unit: "DKK" },
  { label: "NZD- New Zealand Dollar", value: "NZD", unit: "NZD" },
  { label: "MYR- Malaysian Ringgit", value: "MYR", unit: "MYR" },
  { label: "PHP- Philippine Peso", value: "PHP", unit: "PHP" },
  { label: "CHF- Swiss Franc", value: "CHF", unit: "CHF" },
  { label: "NOK- Norwegian Krone", value: "NOK", unit: "NOK" },
  { label: "THB- Thai Baht", value: "THB", unit: "THB" },
  { label: "SEK- Swedish Krona", value: "SEK", unit: "SEK" },
  { label: "SGD- Singapore Dollar", value: "SGD", unit: "SGD" },
  { label: "PLN- Polish Zloty", value: "PLN", unit: "PLN" },
  { label: "TWD- New Taiwan Dollar", value: "TWD", unit: "TWD" },
  { label: "MXN- Mexican Peso", value: "MXN", unit: "MXN" },
  { label: "ILS- New Isreali Shekel", value: "ILS", unit: "ILS" },
  { label: "NGN- Nigerian Naira", value: "NGN", unit: "NGN" },
];

const zeroDecimalCurrencies = ["SATS", "BTC", "JPY"];

export const convertToSmallestCurrencyUnit = (amount: number, currency: string) => {
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return amount;
  }
  return Math.round(amount * 100);
};

export const convertFromSmallestToPresentableCurrencyUnit = (amount: number, currency: string) => {
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return amount;
  }
  return amount / 100;
};
