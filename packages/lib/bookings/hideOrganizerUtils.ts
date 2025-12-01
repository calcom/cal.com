export interface PersonDisplayOptions {
  name: string;
  email: string;
  role: string;
  hideOrganizerName?: boolean;
  hideOrganizerEmail?: boolean;
  isOrganizerExempt?: boolean;
}

/**
 * Formats person display text with hiding logic
 * Returns object with display name and email based on hide flags
 */
export function formatPersonDisplay(options: PersonDisplayOptions) {
  const { name, email, hideOrganizerName, hideOrganizerEmail, isOrganizerExempt } = options;

  const displayName = hideOrganizerName ? "" : name;
  const displayEmail = hideOrganizerEmail && !isOrganizerExempt ? "" : email;

  return { displayName, displayEmail };
}

/**
 * Formats person text for calendar descriptions
 */
export function formatPersonText(options: PersonDisplayOptions, _t: (key: string) => string): string {
  const { displayName, displayEmail } = formatPersonDisplay(options);

  if (displayName) {
    return displayEmail
      ? `${displayName} - ${options.role}\n${displayEmail}`
      : `${displayName} - ${options.role}`;
  } else {
    return displayEmail ? `${options.role}\n${displayEmail}` : options.role;
  }
}

/**
 * Gets ICS attendee object with hiding logic
 * For organizers, only name and email should be included
 * For attendees, additional config (partstat, role, rsvp) should be included
 */
export function getIcsAttendee(
  person: { name: string; email: string },
  hideFlags: { hideOrganizerName?: boolean; hideOrganizerEmail?: boolean },
  isOrganizerExempt: boolean,
  icsConfig?: { partstat: string; role: string; rsvp: boolean }
) {
  const displayName = hideFlags.hideOrganizerName ? "Organizer" : person.name;
  const displayEmail = hideFlags.hideOrganizerEmail && !isOrganizerExempt ? "no-reply@cal.com" : person.email;

  const baseResult = {
    name: displayName,
    email: displayEmail,
  };

  // Only spread icsConfig if provided (for attendees, not organizers)
  return icsConfig ? { ...baseResult, ...icsConfig } : baseResult;
}
