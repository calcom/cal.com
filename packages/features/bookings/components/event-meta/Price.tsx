import dynamic from "next/dynamic";

import type { EventPrice } from "../../types";

// TODO: importing dynamically like this makes it difficult
// to extract currency formatting (currently duplicated in BaseScheduledEmail.tsx)
const AlbyPriceComponent = dynamic(
  () => import("@calcom/app-store/alby/components/AlbyPriceComponent").then((m) => m.AlbyPriceComponent),
  {
    ssr: false,
  }
);

export const Price = ({ price, currency, displayAlternateSymbol = true }: EventPrice) => {
  if (price === 0) return null;

  return (
    <>
      {currency !== "BTC" ? (
        Intl.NumberFormat("en", {
          style: "currency",
          currency: currency.toUpperCase(),
        }).format(price / 100.0)
      ) : (
        <AlbyPriceComponent displaySymbol={displayAlternateSymbol} price={price} />
      )}
    </>
  );
};
