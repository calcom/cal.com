/**
 *
 * These props be used to already set the component in a specific state,
 * even before the data is fetched. Useful for rendering this component
 * on the server.
 */
export interface OptionalServersideSettings {
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

/**
 * @TODO: Abstract this into a reusable type? Or even create a context/zustand
 * people can wrap so they only have to set this once? Although I doubt that
 * people will wrap multiple components in one page and thus one context.
 */
export interface AtomsGlobalConfigProps {
  /**
   * API endpoint for the Booker component to fetch data from,
   * defaults to https://cal.com
   */
  webAppUrl?: string;
}

export interface BookerProps extends OptionalServersideSettings, AtomsGlobalConfigProps {
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
}
