import { lazy, Suspense } from "react";

import { formatPrice } from "@calcom/lib/price";

type EventPrice = { currency: string; price: number; displayAlternateSymbol?: boolean };

const AlbyPriceComponent = lazy(() => import("./AlbyPriceComponent"));

export function Price({ price, currency, displayAlternateSymbol = true }: EventPrice) {
  const formattedPrice = formatPrice(price, currency);

  if (price === 0) return null;

  return currency !== "BTC" ? (
    <>{formattedPrice}</>
  ) : (
    <Suspense>
      <AlbyPriceComponent
        displaySymbol={displayAlternateSymbol}
        price={price}
        formattedPrice={formattedPrice}
      />
    </Suspense>
  );
}
