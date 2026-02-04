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
  const memberTranslationPromises = eventTypeHosts
    .filter((hostEntry) => {
      const hostUser = hostEntry.user;
      const isNotPreviousHost = hostUser.email !== previousHost?.email;
      const isNotOrganizer = hostUser.email !== organizer.email;
      const isCurrentAttendee = attendees.some((att) => att.email === hostUser.email);
      
      return isNotPreviousHost && isNotOrganizer && isCurrentAttendee;
    })
    .map(async (hostEntry) => {
      const hostUser = hostEntry.user;
      const userTranslation = await getTranslation(hostUser.locale ?? "en", "common");
      return {
        id: hostUser.id,
        email: hostUser.email,
        name: hostUser.name || "",
        timeZone: hostUser.timeZone,
        language: { translate: userTranslation, locale: hostUser.locale ?? "en" },
      };
    });

  const resolvedMembers = await Promise.all(memberTranslationPromises);

  if (reassignedHost.email !== organizer.email) {
    const reassignedHostTranslation = await getTranslation(reassignedHost.locale ?? "en", "common");
    resolvedMembers.push({
      id: reassignedHost.id,
      email: reassignedHost.email,
      name: reassignedHost.name || "",
      timeZone: reassignedHost.timeZone,
      language: { translate: reassignedHostTranslation, locale: reassignedHost.locale ?? "en" },
    });
  }

  return resolvedMembers;
}