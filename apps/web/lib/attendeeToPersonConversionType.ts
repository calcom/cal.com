import { Attendee } from "@calcom/prisma/client";
import { Person } from "@calcom/types/Calendar";

export const attendeToPersonConversionType = (attendees: Attendee[]): Person[] => {
  const personsResult = attendees.map((attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      timezone: attendee.timeZone,
      locale: attendee.language.locale,
    };
  });
};
