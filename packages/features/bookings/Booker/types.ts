import type { BookerLayouts } from "@calcom/prisma/zod-utils";

import type { GetBookingType } from "../lib/get-booking";

export interface BookerProps {
  eventSlug: string;
  username: string;

  /**
   * Whether is a team or org, we gather basic info from both
   */
  entity: {
    isUnpublished?: boolean;
    orgSlug?: string | null;
    teamSlug?: string | null;
    name?: string | null;
  };

  /**
   * If month is NOT set as a prop on the component, we expect a query parameter
   * called `month` to be present on the url. If that is missing, the component will
   * default to the current month.
   * @note In case you're using a client side router, please pass the value in as a prop,
   * since the component will leverage window.location, which might not have the query param yet.
   * @format YYYY-MM.
   * @optional
   */
  month?: string;
  /**
   * Default selected date for with the slotpicker will already open.
   * @optional
   */
  selectedDate?: Date;

  hideBranding?: boolean;
  /**
   * Sets the Booker component to the away state.
   * This is NOT revalidated by calling the API.
   */
  isAway?: boolean;
  /**
   * If false and the current username indicates a dynamic booking,
   * the Booker will immediately show an error.
   * This is NOT revalidated by calling the API.
   */
  allowsDynamicBooking?: boolean;
  /**
   * When rescheduling a booking, the current' bookings data is passed in via this prop.
   * The component itself won't fetch booking data based on the ID, since there is not public
   * api to fetch this data. Therefore rescheduling a booking currently is not possible
   * within the atom (i.e. without a server side component).
   */
  bookingData?: GetBookingType;
  /**
   * If this boolean is passed, we will only check team events with this slug and event slug.
   * If it's not passed, we will first query a generic user event, and only if that doesn't exist
   * fetch the team event. In case there's both a team + user with the same slug AND same event slug,
   * that will always result in the user event being returned.
   */
  isTeamEvent?: boolean;
  /**
   * Refers to a multiple-duration event-type
   * It will correspond to selected time from duration query param if exists and if it is allowed as an option,
   * otherwise, the default value is selected
   */
  duration?: number | null;
  /**
   * Configures the selectable options for a multiDuration event type.
   */
  durationConfig?: number[];
  /**
   * Refers to the private link from event types page.
   */
  hashedLink?: string | null;
}

export type BookerState = "loading" | "selecting_date" | "selecting_time" | "booking";
export type BookerLayout = BookerLayouts | "mobile";
export type BookerAreas = "calendar" | "timeslots" | "main" | "meta" | "header";
