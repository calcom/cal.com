import { SatSymbol } from "@calcom/ui/components/icon/SatSymbol";

import type { EventPrice } from "../../types";

export const Price = ({ price, currency, displayAlternateSymbol: displaySymbol = true }: EventPrice) => {
  if (price === 0) return null;

  return (
    <>
      {currency !== "BTC" ? (
        Intl.NumberFormat("en", {
          style: "currency",
          currency: currency.toUpperCase(),
        }).format(price / 100.0)
      ) : (
        <>
          {displaySymbol && <SatSymbol className="h-4 w-4" />}
          {price}
        </>
      )}
    </>
  );
};
