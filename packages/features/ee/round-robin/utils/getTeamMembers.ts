import { getTranslation } from "@calcom/lib/server/i18n";
import type { User, EventTypeHost } from "@calcom/prisma/client";
import type { Attendee } from "@calcom/types/Calendar";

export async function getTeamMembers({
  eventTypeHosts,
  attendees,
  organizer,
  previousHost,
  reassignedHost,
}: {
  eventTypeHosts: EventTypeHost[];
  attendees: Attendee[];
  organizer: User;
  previousHost: User | null;
  reassignedHost: User;
}) {
  const teamMemberPromises = eventTypeHosts
    .filter((host) => {
      const user = host.user;
      return (
        user.email !== previousHost?.email &&
        user.email !== organizer.email &&
        attendees.some((attendee) => attendee.email === user.email)
      );
    })
    .map(async (host) => {
      const user = host.user;
      const tTeamMember = await getTranslation(user.locale ?? "en", "common");
      return {
        id: user.id,
        email: user.email,
        name: user.name || "",
        timeZone: user.timeZone,
        language: { translate: tTeamMember, locale: user.locale ?? "en" },
      };
    });

  const teamMembers = await Promise.all(teamMemberPromises);

  if (reassignedHost.email !== organizer.email) {
    const tReassignedHost = await getTranslation(reassignedHost.locale ?? "en", "common");
    teamMembers.push({
      id: reassignedHost.id,
      email: reassignedHost.email,
      name: reassignedHost.name || "",
      timeZone: reassignedHost.timeZone,
      language: { translate: tReassignedHost, locale: reassignedHost.locale ?? "en" },
    });
  }

  return teamMembers;
}
