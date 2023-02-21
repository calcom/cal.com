import getPaymentAppData from "@calcom/lib/getPaymentAppData";

import type { PublicEvent } from "../../types";

export const EventPrice = ({ event }: { event: PublicEvent }) => {
  const stripeAppData = getPaymentAppData(event);

  if (stripeAppData.price === 0) return null;

  // @TODO: I replaced the large react-intl package with intl.numberformat,
  // verify that this has the same result.
  return (
    <>
      {Intl.NumberFormat("en", {
        style: "currency",
        currency: stripeAppData.currency.toUpperCase(),
      }).format(stripeAppData.price / 100.0)}
    </>
  );
};
