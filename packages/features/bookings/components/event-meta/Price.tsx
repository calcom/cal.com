import getPaymentAppData from "@calcom/lib/getPaymentAppData";

import type { PublicEvent } from "../../types";

export const EventPrice = ({ event }: { event: PublicEvent }) => {
  const paymentAppData = getPaymentAppData(event);

  if (paymentAppData.price === 0) return null;

  return (
    <>
      {paymentAppData.currency !== "BTC"
        ? Intl.NumberFormat("en", {
            style: "currency",
            currency: paymentAppData.currency.toUpperCase(),
          }).format(paymentAppData.price / 100.0)
        : `${paymentAppData.price}`}
    </>
  );
};
