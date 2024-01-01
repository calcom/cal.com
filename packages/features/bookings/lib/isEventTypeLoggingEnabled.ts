export function isEventTypeLoggingEnabled({
  eventTypeId,
  usernameOrTeamName,
}: {
  eventTypeId?: number | null;
  usernameOrTeamName?: string | string[];
}) {
  const usernameOrTeamnamesList =
    usernameOrTeamName instanceof Array ? usernameOrTeamName : [usernameOrTeamName];
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const bookingLoggingEventIds = process.env.BOOKING_LOGGING_EVENT_IDS || "";
  const isEnabled = bookingLoggingEventIds.split(",").some((id) => {
    if (Number(id.trim()) === eventTypeId) {
      return true;
    }
  });

  if (isEnabled) {
    return true;
  }

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const bookingLoggingUsername = process.env.BOOKING_LOGGING_USER_OR_TEAM_NAME || "";
  return bookingLoggingUsername.split(",").some((u) => {
    return usernameOrTeamnamesList.some((foundUsername) => foundUsername === u.trim());
  });
}
