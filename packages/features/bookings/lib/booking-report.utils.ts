/**
 * Extracts the booker email from booking attendees
 * Convention: first attendee is the booker
 */
export function extractBookerEmail(attendees: Array<{ email: string }>): string | null {
  return attendees[0]?.email || null;
}
