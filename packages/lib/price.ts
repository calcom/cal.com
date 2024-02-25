import { convertFromSmallestToPresentableCurrencyUnit } from "@calcom/app-store/stripepayment/lib/currencyConversions";

export const formatPrice = (price: number, currency: string | undefined, locale = "en") => {
  switch (currency) {
    case "BTC":
      return `${price} sats`;
    default:
      currency = currency?.toUpperCase() || "USD";
      return `${Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
      }).format(convertFromSmallestToPresentableCurrencyUnit(price, currency))}`;
  }
};
