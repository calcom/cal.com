/**
 *
 * @param number The amount to format in cents
 * @returns string
 */
function formatCurrency(number: number) {
  const fromCents = number / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: process.env.NEXT_PUBLIC_CURRENCY_CODE || "USD",
    minimumFractionDigits: fromCents % 1 == 0 ? 0 : 2,
    maximumFractionDigits: fromCents % 1 == 0 ? 0 : undefined,
  }).format(fromCents);
}

export default formatCurrency;
