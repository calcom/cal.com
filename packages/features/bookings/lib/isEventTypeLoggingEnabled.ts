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
  const validEventIds = bookingLoggingEventIds
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => !isNaN(id) && id > 0);

  const isEnabled = eventTypeId && validEventIds.includes(eventTypeId);

  if (isEnabled) {
    return true;
  }

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const bookingLoggingUsername = process.env.BOOKING_LOGGING_USER_OR_TEAM_NAME || "";
  const validUsernames = bookingLoggingUsername
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  return validUsernames.some((username) => {
    return usernameOrTeamnamesList.some((foundUsername) => foundUsername === username);
  });
}
