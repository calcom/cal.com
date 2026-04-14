import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";

export type BookingListingStatus = NonNullable<
  RouterInputs["viewer"]["bookings"]["get"]["filters"]["statuses"]
>[number];

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

type EventTypeWithParent = NonNullable<BookingItem["eventType"]> & {
  parent?: {
    id: number | null;
    teamId: number | null;
  } | null;
};

export type BookingItemProps = Omit<BookingItem, "eventType"> & {
  eventType: EventTypeWithParent;
  listingStatus: BookingListingStatus;
  recurringInfo: RouterOutputs["viewer"]["bookings"]["get"]["recurringInfo"][number] | undefined;
  loggedInUser: {
    userId: number | undefined;
    userTimeZone: string | undefined;
    userTimeFormat: number | null | undefined;
    userEmail: string | undefined;
    userIsOrgAdminOrOwner: boolean | undefined;
    teamsWhereUserIsAdminOrOwner:
      | {
          id: number;
          teamId: number;
        }[]
      | undefined;
  };
  isToday: boolean;
  onClick?: () => void;
};
