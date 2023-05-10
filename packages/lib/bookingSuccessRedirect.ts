import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context";

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
  router: AppRouterInstance;
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

  // @ts-expect-error query has non-string values
  const urlSearchParams = new URLSearchParams(query ?? undefined);

  return router.push(`/booking/${bookingUid}?${urlSearchParams.toString()}`);
};
