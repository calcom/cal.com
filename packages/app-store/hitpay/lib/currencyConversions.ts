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
