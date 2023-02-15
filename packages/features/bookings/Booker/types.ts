export interface BookerProps {
  eventSlug: string;
  username: string;

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
}

export type BookerState = "loading" | "selecting_date" | "selecting_time" | "booking";
export type BookerLayout = "small_calendar" | "large_timeslots" | "large_calendar" | "mobile";
export type BookerAreas = "calendar" | "timeslots" | "main" | "meta";
