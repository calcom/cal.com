/**
 * Docs: https://stripe.com/docs/currencies#zero-decimal
 * */
const zeroDecimalCurrencies = [
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
];

export const convertToSmallestCurrencyUnit = (amount: number, currency: string) => {
  // Special cases
  if (zeroDecimalCurrencies.includes(currency)) {
    return amount;
  }
  return Math.round(amount * 100);
};

export const convertFromSmallestToPresentableCurrencyUnit = (amount: number, currency: string) => {
  // Special cases
  if (zeroDecimalCurrencies.includes(currency)) {
    return amount;
  }
  return amount / 100;
};
