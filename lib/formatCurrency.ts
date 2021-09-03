/**
 *
 * @param number The amount to format in cents
 * @returns string
 */
export function formatCurrency(number: number) {
  const fromCents = number / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: process.env.NEXT_PUBLIC_CURRENCY_CODE || "USD",
    minimumFractionDigits: fromCents % 1 == 0 ? 0 : 2,
    maximumFractionDigits: fromCents % 1 == 0 ? 0 : undefined,
  }).format(fromCents);
}

export function formatAmountForDisplay(amount: number): string {
  const fromCents = amount / 100;
  const numberFormat = new Intl.NumberFormat(["en-US"], {
    style: "currency",
    currency: process.env.NEXT_PUBLIC_CURRENCY_CODE || "USD",
    currencyDisplay: "symbol",
    minimumFractionDigits: fromCents % 1 == 0 ? 0 : 2,
    maximumFractionDigits: fromCents % 1 == 0 ? 0 : undefined,
  });
  return numberFormat.format(amount);
}

export function formatAmountForStripe(amount: number): number {
  const numberFormat = new Intl.NumberFormat(["en-US"], {
    style: "currency",
    currency: process.env.NEXT_PUBLIC_CURRENCY_CODE || "USD",
    currencyDisplay: "symbol",
  });
  const parts = numberFormat.formatToParts(amount);
  let zeroDecimalCurrency = true;
  for (const part of parts) {
    if (part.type === "decimal") {
      zeroDecimalCurrency = false;
    }
  }
  return zeroDecimalCurrency ? amount : Math.round(amount * 100);
}

export default formatCurrency;
