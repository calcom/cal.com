/**
 * TODO: We could convert it into a hook and then we can access bookerStore and timePreferences stores directly here, avoiding the need to do it by the caller
 */
export const getBookerTimezone = ({
  storeTimezone,
  bookerUserPreferredTimezone,
}: {
  storeTimezone: string | null;
  bookerUserPreferredTimezone: string;
}) => {
  // BookerStore timezone is the one that is updated no matter what could be the reason of the update
  // e.g. timezone configured through cal.tz query param is available there but not in the preferences as those are booker user's preferences
  return storeTimezone ?? bookerUserPreferredTimezone;
};
