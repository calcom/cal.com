import type { getEventTypeResponse } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { getTranslation } from "@calcom/lib/server/i18n";

import type { BookingSelectResult } from "./bookingSelect";

type Attendee = {
  name: string;
  id: number;
  email: string;
  timeZone: string;
  locale: string | null;
  bookingId: number | null;
  phoneNumber: string | null;
  noShow: boolean | null;
};

// TODO: We have far too many different types here. They're all users or hosts at the end of the day.
type OrganizerType =
  | getEventTypeResponse["hosts"][number]["user"]
  | IsFixedAwareUser
  | {
      id: number;
      email: string;
      name: string | null;
      locale: string | null;
      timeZone: string;
      username: string | null;
    };

export async function getTeamMembers({
  eventTypeHosts,
  attendees,
  organizer,
  previousHost,
  reassignedHost,
}: {
  eventTypeHosts: getEventTypeResponse["hosts"];
  attendees: Attendee[];
  organizer: OrganizerType;
  previousHost: BookingSelectResult["user"] | getEventTypeResponse["hosts"][number]["user"] | null;
  reassignedHost: getEventTypeResponse["hosts"][number]["user"];
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
