import { Person } from "ics";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { getIntegrationName } from "@lib/integrations";

import { BASE_URL } from "./config/constants";
import { CalendarEvent } from "./integrations/calendar/interfaces/Calendar";

const translator = short();

// The odd indentation in this file is necessary because otherwise the leading tabs will be applied into the event description.

export const getWhat = (calEvent: CalendarEvent) => {
  return `
${calEvent.organizer.language.translate("what")}:
${calEvent.type}
  `;
};

export const getWhen = (calEvent: CalendarEvent) => {
  return `
${calEvent.organizer.language.translate("invitee_timezone")}:
${calEvent.attendees[0].timeZone}
  `;
};

export const getWho = (calEvent: CalendarEvent) => {
  const attendees = calEvent.attendees
    .map((attendee) => {
      return `
${attendee?.name || calEvent.organizer.language.translate("guest")}
${attendee.email}
      `;
    })
    .join("");

  const organizer = `
${calEvent.organizer.name} - ${calEvent.organizer.language.translate("organizer")}
${calEvent.organizer.email}
  `;

  return `
${calEvent.organizer.language.translate("who")}:
${organizer + attendees}
  `;
};

export const getAdditionalNotes = (calEvent: CalendarEvent) => {
  return `
${calEvent.organizer.language.translate("additional_notes")}:
${calEvent.description}
  `;
};

export const getLocation = (calEvent: CalendarEvent) => {
  let providerName = calEvent.location ? getIntegrationName(calEvent.location) : "";

  if (calEvent.location && calEvent.location.includes("integrations:")) {
    const location = calEvent.location.split(":")[1];
    providerName = location[0].toUpperCase() + location.slice(1);
  }

  if (calEvent.videoCallData) {
    return calEvent.videoCallData.url;
  }

  if (calEvent.additionInformation?.hangoutLink) {
    return calEvent.additionInformation.hangoutLink;
  }

  return providerName || calEvent.location || "";
};

export const getManageLink = (calEvent: CalendarEvent) => {
  return `
${calEvent.organizer.language.translate("need_to_reschedule_or_cancel")}
${getCancelLink(calEvent)}
  `;
};

export const getUid = (calEvent: CalendarEvent): string => {
  return calEvent.uid ?? translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));
};

export const getCancelLink = (calEvent: CalendarEvent): string => {
  return BASE_URL + "/cancel/" + getUid(calEvent);
};

export const getRichDescription = (calEvent: CalendarEvent, attendee?: Person) => {
  // Only the original attendee can make changes to the event
  // Guests cannot

  if (attendee && attendee === calEvent.attendees[0]) {
    return `
${getWhat(calEvent)}
${getWhen(calEvent)}
${getWho(calEvent)}
${calEvent.organizer.language.translate("where")}:
${getLocation(calEvent)}
${getAdditionalNotes(calEvent)}
  `.trim();
  }

  return `
${getWhat(calEvent)}
${getWhen(calEvent)}
${getWho(calEvent)}
${calEvent.organizer.language.translate("where")}:
${getLocation(calEvent)}
${getAdditionalNotes(calEvent)}
${getManageLink(calEvent)}
  `.trim();
};
