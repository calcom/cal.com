import type { NextRouter } from "next/router";

import type { BookingResponse } from "@calcom/web/lib/types/booking";

import type { EventType } from ".prisma/client";

const getBookingRedirectExtraParams = (booking: BookingResponse) => {
  type BookingResponseKey = keyof BookingResponse;
  const redirectQueryParamKeys: BookingResponseKey[] = [
    "title",
    "description",
    "startTime",
    "endTime",
    "location",
  ];

  return (Object.keys(booking) as BookingResponseKey[])
    .filter((key) => redirectQueryParamKeys.includes(key))
    .reduce((obj, key) => Object.assign(obj, { [key]: booking[key] }), {});
};

export const bookingSuccessRedirect = async ({
  successRedirectUrl,
  booking,
  query,
  router,
  passExtraQueryParams,
}: {
  successRedirectUrl: EventType["successRedirectUrl"];
  booking: BookingResponse;
  query: Record<string, string | null | undefined | boolean>;
  router: NextRouter;
  passExtraQueryParams: boolean;
}) => {
  if (successRedirectUrl) {
    const url = new URL(successRedirectUrl);
    const extraParams = passExtraQueryParams ? getBookingRedirectExtraParams(booking) : {};
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
