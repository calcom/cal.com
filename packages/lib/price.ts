export const formatPrice = (price: number, currency: string | undefined, locale = "en") => {
  switch (currency) {
    case "BTC":
      return `${price} sats`;
    default:
      return `${Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency?.toUpperCase() || "USD",
      }).format(price / 100.0)}`;
  }
};
