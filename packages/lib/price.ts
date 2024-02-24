import { convertFromSmallestToPresentableCurrencyUnit } from "@calcom/app-store/stripepayment/lib/currencyConversions";

export const formatPrice = (price: number, currency: string | undefined, locale = "en") => {
  switch (currency) {
    case "BTC":
      return `${price} sats`;
    default:
      return `${Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency?.toUpperCase() || "USD",
      }).format(convertFromSmallestToPresentableCurrencyUnit(price, currency))}`;
  }
};
