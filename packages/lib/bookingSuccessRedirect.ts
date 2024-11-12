import type { EventType } from "@prisma/client";
import { useRouter } from "next/navigation";

import dayjs from "@calcom/dayjs";
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
  "uid" | "title" | "description" | "startTime" | "endTime" | "location" | "attendees" | "user" | "responses"
>;

type BookingResponseKey = keyof SuccessRedirectBookingType;

type ResultType = {
  [key in BookingResponseKey]?: SuccessRedirectBookingType[key];
} & {
  hostName?: string[];
  attendeeName?: string | null;
};

function convertResponsesToParams(obj: ResultType): ResultType {
  interface Responses {
    name: { lastName: string; firstName: string } | string;
    phone: string;
  }

  const result: ResultType = { ...obj };
  if (!result.responses) return { ...obj };
  const responses = result.responses as unknown as Responses;
  // Extract and conditionally add properties
  if (typeof responses.phone === "string") {
    (result.responses as Record<string, unknown>).phone = responses.phone;
  }

  if (typeof responses.name === "string") {
    (result.responses as Record<string, unknown>).name = responses.name;
  } else if (responses.name && typeof responses.name === "object") {
    if (responses.name.firstName)
      (result.responses as Record<string, unknown>).firstName = responses.name.firstName;
    if (responses.name.lastName)
      (result.responses as Record<string, unknown>).lastName = responses.name.lastName;
  }

  return result;
}

export const getBookingRedirectExtraParams = (booking: SuccessRedirectBookingType) => {
  const redirectQueryParamKeys: BookingResponseKey[] = [
    "title",
    "description",
    "startTime",
    "endTime",
    "location",
    "attendees",
    "user",
    "responses",
  ];

  // Helper function to extract response details (e.g., phone, attendee's first and last name)
  function extractResponseDetails(booking, obj: ResultType): ResultType {
    type Responses = {
      phone?: string;
      name:
        | {
            firstName: string;
            lastName: string;
          }
        | string;
    };
    const responses = { ...obj } as unknown as Responses;
    if (booking.responses?.phone) responses.phone = booking.responses.phone;
    if (booking.responses?.name?.firstName) responses.attendeeFirstName = booking.responses.name.firstName;
    if (booking.responses?.name?.lastName) responses.attendeeLastName = booking.responses.name.lastName;
    return responses;
  }

  // Helper function to extract user details (e.g., host name and time zone)
  function extractUserDetails(booking, obj: ResultType): ResultType {
    if (booking.user?.name) {
      const hostStartTime = dayjs(booking.startTime).tz(booking.user.timeZone).format();
      return {
        ...obj,
        hostName: [...(obj.hostName || []), booking.user.name],
        hostStartTime,
      };
    }
    return obj;
  }

  // Helper function to extract attendee and guest details
  function extractAttendeesAndGuests(booking, obj: ResultType): ResultType {
    if (!Array.isArray(booking.attendees) || booking.attendees.length === 0) return obj;

    const attendeeName = booking.attendees[0]?.name || null;
    const attendeeTimeZone = booking.attendees[0]?.timeZone || "UTC";
    const attendeeStartTime = dayjs(booking.startTime).tz(attendeeTimeZone).format();

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
      attendeeStartTime,
      hostName: [...(obj.hostName || []), ...hostNames],
      guestEmail: guestEmails.length > 0 ? guestEmails : undefined,
    };
  }

  const result = (Object.keys(booking) as BookingResponseKey[])
    .filter((key) => redirectQueryParamKeys.includes(key))
    .reduce<ResultType>((obj, key) => {
      if (key === "responses") return extractResponseDetails(booking, obj);
      if (key === "user") return extractUserDetails(booking, obj);
      if (key === "attendees") return extractAttendeesAndGuests(booking, obj);
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
