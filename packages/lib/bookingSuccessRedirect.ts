import type { EventType } from "@prisma/client";
import { useRouter } from "next/navigation";

import type { PaymentPageProps } from "@calcom/ee/payments/pages/payment";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import type { BookingResponse } from "@calcom/features/bookings/types";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { navigateInTopWindow } from "@calcom/lib/navigateInTopWindow";

function getNewSearchParams(args: {
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

type SuccessRedirectBookingType = Pick<
  BookingResponse | PaymentPageProps["booking"],
  "uid" | "title" | "description" | "startTime" | "endTime" | "location" | "attendees" | "user"
>;

export const getBookingRedirectExtraParams = (booking: SuccessRedirectBookingType) => {
  type BookingResponseKey = keyof SuccessRedirectBookingType;
  const redirectQueryParamKeys: BookingResponseKey[] = [
    "title",
    "description",
    "startTime",
    "endTime",
    "location",
    "attendees",
    "user",
  ];

  type ResultType = {
    [key in BookingResponseKey]?: SuccessRedirectBookingType[key];
  } & {
    hostName?: string[];
    attendeeName?: string | null;
  };

  const result = (Object.keys(booking) as BookingResponseKey[])
    .filter((key) => redirectQueryParamKeys.includes(key))
    .reduce<ResultType>((obj, key) => {
      if (key === "user" && booking.user?.name) {
        return { ...obj, hostName: [...(obj.hostName || []), booking.user.name] };
      }

      if (key === "attendees" && Array.isArray(booking.attendees)) {
        const attendeeName = booking.attendees[0]?.name || null;
        const { hostNames, guestEmails } = booking.attendees.slice(1).reduce(
          (acc, attendee) => {
            if (attendee.name) {
              acc.hostNames.push(attendee.name);
            } else if (attendee.email) {
              acc.guestEmails.push(attendee.email);
            }
            return acc;
          },
          { hostNames: [], guestEmails: [] } as { hostNames: string[]; guestEmails: string[] }
        );
        return {
          ...obj,
          attendeeName,
          hostName: [...(obj.hostName || []), ...hostNames],
          guestEmail: guestEmails.length > 0 ? guestEmails : undefined,
        };
      }
      return { ...obj, [key]: booking[key] };
    }, {});

  const queryCompatibleParams: Record<string, string | boolean | null | undefined> = {
    ...Object.fromEntries(
      Object.entries(result).map(([key, value]) => {
        if (Array.isArray(value)) {
          return [key, value.join(", ")];
        }
        if (typeof value === "object" && value !== null) {
          // Skip complex objects (user, attendees) as we are extracting only needed fields
          return [key, undefined];
        }
        return [key, value];
      })
    ),
    hostName: result.hostName?.join(", "),
    attendeeName: result.attendeeName || undefined,
  };

  return queryCompatibleParams;
};

export const useBookingSuccessRedirect = () => {
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const isEmbed = useIsEmbed();
  const bookingSuccessRedirect = ({
    successRedirectUrl,
    query,
    booking,
    forwardParamsSuccessRedirect,
  }: {
    successRedirectUrl: EventType["successRedirectUrl"];
    forwardParamsSuccessRedirect: EventType["forwardParamsSuccessRedirect"];
    query: Record<string, string | null | undefined | boolean>;
    booking: SuccessRedirectBookingType;
  }) => {
    // Ensures that the param is added both to external redirect url and booking success page URL
    query = {
      ...query,
      "cal.rerouting": searchParams.get("cal.rerouting"),
    };

    if (successRedirectUrl) {
      const url = new URL(successRedirectUrl);
      // Using parent ensures, Embed iframe would redirect outside of the iframe.
      if (!forwardParamsSuccessRedirect) {
        navigateInTopWindow(url.toString());
        return;
      }
      const bookingExtraParams = getBookingRedirectExtraParams(booking);
      const newSearchParams = getNewSearchParams({
        query: {
          ...query,
          ...bookingExtraParams,
        },
        searchParams: searchParams ?? undefined,
      });
      newSearchParams.forEach((value, key) => {
        url.searchParams.append(key, value);
      });

      navigateInTopWindow(url.toString());
      return;
    }

    // TODO: Abstract it out and reuse at other places where we navigate within the embed. Though this is needed only in case of hard navigation happening but we aren't sure where hard navigation happens and where a soft navigation
    // This is specially true after App Router it seems
    const headersRelatedSearchParams = searchParams
      ? {
          "flag.coep": searchParams.get("flag.coep") ?? "false",
        }
      : undefined;

    // We don't want to forward all search params, as they could possibly break the booking page.
    const newSearchParams = getNewSearchParams({
      query,
      searchParams: new URLSearchParams(headersRelatedSearchParams),
    });
    return router.push(`/booking/${booking.uid}${isEmbed ? "/embed" : ""}?${newSearchParams.toString()}`);
  };

  return bookingSuccessRedirect;
};
