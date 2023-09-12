import getPaymentAppData from "@calcom/lib/getPaymentAppData";

import type { PublicEvent } from "../../types";

export const EventPrice = ({ event }: { event: PublicEvent }) => {
  const stripeAppData = getPaymentAppData(event);

  if (stripeAppData.price === 0) return null;

  return (
    <>
      {Intl.NumberFormat("en", {
        style: "currency",
        currency: stripeAppData.currency.toUpperCase(),
      }).format(stripeAppData.price / 100.0)}
    </>
  );
};
