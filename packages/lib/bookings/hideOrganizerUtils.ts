/**
 * Label used when organizer name is hidden
 * Note: This is used for ICS calendar files and should NOT be translated
 * For UI display and emails, use the translated "organizer" key instead
 */
export const ANONYMOUS_ORGANIZER_NAME = "Organizer";

/**
 * Email address used when organizer email is hidden (except for exempt domains)
 */
export const NO_REPLY_EMAIL = "no-reply@cal.com";

export interface PersonDisplayOptions {
  name: string;
  email: string;
  role: string;
  hideOrganizerName?: boolean;
  hideOrganizerEmail?: boolean;
  isOrganizerExempt?: boolean;
}

/**
 * Formats person display text with hiding logic for UI/email display
 * Returns object with display name and email based on hide flags
 *
 * Note: Returns empty string for hidden name (not ANONYMOUS_ORGANIZER_NAME constant)
 * This allows calling code to display only the role (e.g., translated "Organizer" text)
 * This is different from getIcsAttendee which returns "Organizer" for ICS file technical requirements
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
export function formatPersonText(options: PersonDisplayOptions): string {
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
 * Gets ICS attendee object with hiding logic for calendar file generation
 * For organizers, only name and email should be included
 * For attendees, additional config (partstat, role, rsvp) should be included
 *
 * Note: Returns ANONYMOUS_ORGANIZER_NAME constant ("Organizer") for hidden name
 * This is required because ICS files need a non-empty name value for ATTENDEE/ORGANIZER properties
 * This is different from formatPersonDisplay which returns empty string for flexible UI display
 */
export function getIcsAttendee(
  person: { name: string; email: string },
  hideFlags: { hideOrganizerName?: boolean; hideOrganizerEmail?: boolean },
  isOrganizerExempt: boolean,
  icsConfig?: { partstat: string; role: string; rsvp: boolean }
) {
  const displayName = hideFlags.hideOrganizerName ? ANONYMOUS_ORGANIZER_NAME : person.name;
  const displayEmail = hideFlags.hideOrganizerEmail && !isOrganizerExempt ? NO_REPLY_EMAIL : person.email;

  const baseResult = {
    name: displayName,
    email: displayEmail,
  };

  // Only spread icsConfig if provided (for attendees, not organizers)
  return icsConfig ? { ...baseResult, ...icsConfig } : baseResult;
}
