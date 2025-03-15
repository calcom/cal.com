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
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return amount;
  }
  return Math.round(amount * 100);
};

export const convertFromSmallestToPresentableCurrencyUnit = (amount: number, currency: string) => {
  // Special cases
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return amount;
  }
  return amount / 100;
};

export const getCurrencySymbol = (currencyCode: string): string => {
  try {
    const formatter = new Intl.NumberFormat("en", { style: "currency", currency: currencyCode });
    const parts = formatter.formatToParts(1);
    const currencyPart = parts.find((part) => part.type === "currency");
    return currencyPart?.value || "$";
  } catch {
    return "$";
  }
};
