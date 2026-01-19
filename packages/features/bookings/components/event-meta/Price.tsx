import type { ComponentType, JSX } from "react";

import dynamic from "next/dynamic";

import { formatPrice } from "@calcom/lib/currencyConversions";

import type { EventPrice } from "@calcom/features/bookings/types";

const AlbyPriceComponent: ComponentType<{
  displaySymbol: boolean;
  price: number;
  formattedPrice: string;
}> = dynamic(
  () => import("@calcom/app-store/alby/components/AlbyPriceComponent").then((m) => m.AlbyPriceComponent),
  {
    ssr: false,
  }
);

export const Price = ({ price, currency, displayAlternateSymbol = true }: EventPrice): JSX.Element | null => {
  if (price === 0) return null;

  const formattedPrice = formatPrice(price, currency);

  if (currency !== "BTC") {
    return <span>{formattedPrice}</span>;
  }

  return (
    <AlbyPriceComponent
      displaySymbol={displayAlternateSymbol}
      price={price}
      formattedPrice={formattedPrice}
    />
  );
};
