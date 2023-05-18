import type { NextRouter } from "next/router";

import type { PaymentPageProps } from "@calcom/ee/payments/pages/payment";
import type { BookingResponse } from "@calcom/web/lib/types/booking";

import type { EventType } from ".prisma/client";

type SuccessRedirectBookingType = BookingResponse | PaymentPageProps["booking"];
export const getBookingRedirectExtraParams = (booking: SuccessRedirectBookingType) => {
  type BookingResponseKey = keyof SuccessRedirectBookingType;
  const redirectQueryParamKeys: BookingResponseKey[] = [
    "title",
    "description",
    "startTime",
    "endTime",
    "location",
  ];

  return (Object.keys(booking) as BookingResponseKey[])
    .filter((key) => redirectQueryParamKeys.includes(key))
    .reduce((obj, key) => ({ ...obj, [key]: booking[key] }), {});
};

export const bookingSuccessRedirect = async ({
  successRedirectUrl,
  booking,
  query,
  router,
}: {
  successRedirectUrl: EventType["successRedirectUrl"];
  booking: SuccessRedirectBookingType;
  query: Record<string, string | null | undefined | boolean>;
  router: NextRouter;
}) => {
  if (successRedirectUrl) {
    const url = new URL(successRedirectUrl);
    const extraParams = getBookingRedirectExtraParams(booking);
    const queryWithExtraParams = { ...query, ...extraParams };
    Object.entries(queryWithExtraParams).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }
      url.searchParams.append(key, String(value));
    });

    // Using parent ensures, Embed iframe would redirect outside of the iframe.
    window.parent.location.href = url.toString();
    return;
  }
  return router.push({
    pathname: `/booking/${booking.uid}`,
    query,
  });
};
