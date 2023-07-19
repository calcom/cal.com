import type { Booking, EventType } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";

export const useBookingSuccessRedirect = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingSuccessRedirect = ({
    successRedirectUrl,
    bookingUid,
    query,
  }: {
    successRedirectUrl: EventType["successRedirectUrl"];
    bookingUid: Booking["uid"] | undefined;
    query: Record<string, string | null | undefined | boolean>;
  }) => {
    const newSearchParams = new URLSearchParams(searchParams);
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }
      newSearchParams.append(key, String(value));
    });

    if (successRedirectUrl) {
      const url = new URL(successRedirectUrl);
      // Using parent ensures, Embed iframe would redirect outside of the iframe.
      window.parent.location.href = `${url.toString()}?${newSearchParams.toString()}`;
      return;
    }
    return router.push(`/booking/${bookingUid}?${newSearchParams.toString()}`);
  };

  return bookingSuccessRedirect;
};
