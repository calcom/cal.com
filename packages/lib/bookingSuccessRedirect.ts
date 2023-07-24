import type { NextRouter } from "next/router";

import type { EventType } from ".prisma/client";

// Let's be very clear what all query params we are supposed to pass
type SuccessRedirectBookingType = Record<
  "title" | "description" | "startTime" | "endTime" | "location" | "uid",
  string
>;

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
  query: Record<string, string | null | undefined | boolean> & {
    // These params are part of the documented API and must be passed to the custom redirect URL
    email: string;
    // TODO: Change formerTime to ISO date string format and then document it.
    // Also it might be best to send a new formTimeIso param instead of changing the existing one.
    // formerTime: string;
  };
  router: NextRouter;
}) => {
  if (successRedirectUrl) {
    const url = new URL(successRedirectUrl);
    const extraParams = getBookingRedirectExtraParams(booking);
    const queryWithExtraParams = { booker_email: query.email, ...extraParams };
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
