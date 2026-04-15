export const currencyOptions = [
  { label: "Nigerian naira (NGN)", value: "ngn" },
  { label: "Ghanaian cedi (GHS)", value: "ghs" },
  { label: "South African rand (ZAR)", value: "zar" },
  { label: "Kenyan shilling (KES)", value: "kes" },
  { label: "United States dollar (USD)", value: "usd" },
];

export const currencySymbols: Record<string, string> = {
  ngn: "₦",
  ghs: "GH₵",
  zar: "R",
  kes: "KSh",
  usd: "$",
};

export const isAcceptedCurrencyCode = (code: string): code is keyof typeof currencySymbols => {
  return code in currencySymbols;
};
