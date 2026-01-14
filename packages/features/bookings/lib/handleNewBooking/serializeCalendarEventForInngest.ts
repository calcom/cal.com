import type { CalendarEvent, Person, TeamMember } from "@calcom/types/Calendar";

/**
 * Serializes CalendarEvent for Inngest by removing non-serializable functions
 * (like translate functions) and keeping only serializable data.
 *
 * This is necessary because Inngest events must be JSON-serializable.
 */
export function serializeCalendarEventForInngest(evt: CalendarEvent): Omit<
  CalendarEvent,
  "organizer" | "attendees" | "team"
> & {
  organizer: Omit<Person, "language"> & { language: { locale: string } };
  attendees: Array<Omit<Person, "language"> & { language: { locale: string } }>;
  team?: Omit<CalendarEvent["team"], "members"> & {
    members: Array<Omit<TeamMember, "language"> & { language: { locale: string } }>;
  };
} {
  const serializePerson = (person: Person): Omit<Person, "language"> & { language: { locale: string } } => {
    return {
      ...person,
      language: {
        locale: person.language.locale,
      },
    };
  };

  const serializeTeamMember = (
    member: TeamMember
  ): Omit<TeamMember, "language"> & { language: { locale: string } } => {
    return {
      ...member,
      language: {
        locale: member.language.locale,
      },
    };
  };

  return {
    ...evt,
    organizer: serializePerson(evt.organizer),
    attendees: evt.attendees.map(serializePerson),
    ...(evt.team
      ? {
          team: {
            ...evt.team,
            members: evt.team.members.map(serializeTeamMember),
          },
        }
      : {}),
  };
}
