export const applyMeetingUrlTemplate = (
  urlTemplate?: string | null,
  attendeeHash?: string | null,
  isModerator?: boolean
) => {
  if (!attendeeHash || !urlTemplate) return urlTemplate;
  return urlTemplate.replace("{ATTENDEE_HASH}", isModerator ? "" : attendeeHash);
};
