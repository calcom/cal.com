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
  return storeTimezone ?? bookerUserPreferredTimezone;
};
