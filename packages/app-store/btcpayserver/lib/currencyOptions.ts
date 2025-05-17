export const currencyOptions = [
  { label: "SATS", value: "BTC", unit: "SATS" },
  { label: "USD", value: "USD", unit: "USD" },
];

const zeroDecimalCurrencies = ["SATS", "BTC"];

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
