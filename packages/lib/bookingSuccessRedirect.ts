import type { Booking, EventType } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";

function getNewSeachParams(args: {
  query: Record<string, string | null | undefined | boolean>;
  searchParams?: URLSearchParams;
}) {
  const { query, searchParams } = args;
  const newSearchParams = new URLSearchParams(searchParams);
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    newSearchParams.append(key, String(value));
  });
  return newSearchParams;
}

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
    if (successRedirectUrl) {
      const url = new URL(successRedirectUrl);
      // Using parent ensures, Embed iframe would redirect outside of the iframe.
      const newSearchParams = getNewSeachParams({ query, searchParams });
      window.parent.location.href = `${url.toString()}?${newSearchParams.toString()}`;
      return;
    }
    const newSearchParams = getNewSeachParams({ query });
    return router.push(`/booking/${bookingUid}?${newSearchParams.toString()}`);
  };

  return bookingSuccessRedirect;
};
