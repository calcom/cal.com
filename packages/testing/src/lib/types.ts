/**
 * Tracking type for UTM parameters in booking requests.
 * Cloned from @calcom/features/bookings/lib/handleNewBooking/types to avoid circular dependency.
 */
export type Tracking = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};
