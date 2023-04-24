import type { NextRouter } from "next/router";

import type { Booking, EventType } from ".prisma/client";

export const bookingSuccessRedirect = async ({
  successRedirectUrl,
  bookingUid,
  query,
  router,
}: {
  successRedirectUrl: EventType["successRedirectUrl"];
  bookingUid: Booking["uid"] | undefined;
  query: Record<string, string | null | undefined | boolean>;
  router: NextRouter;
}) => {
  if (successRedirectUrl) {
    const url = new URL(successRedirectUrl);
    Object.entries(query).forEach(([key, value]) => {
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
    pathname: `/booking/${bookingUid}`,
    query,
  });
};
