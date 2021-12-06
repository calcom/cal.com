import dayjs from "dayjs";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { getIntegrationName } from "@lib/integrations";

import { CalendarEvent } from "./calendarClient";
import { BASE_URL } from "./config/constants";

const translator = short();

export const getWhat = (calEvent: CalendarEvent) => {
  return `
${calEvent.language("what")}
${calEvent.type}
  `;
};

export const getWhen = (calEvent: CalendarEvent) => {
  const inviteeStart = dayjs(calEvent.startTime).tz(calEvent.attendees[0].timeZone);
  const inviteeEnd = dayjs(calEvent.endTime).tz(calEvent.attendees[0].timeZone);

  return `
${calEvent.language("when")}
${calEvent.language(inviteeStart.format("dddd").toLowerCase())}, ${calEvent.language(
    inviteeStart.format("MMMM").toLowerCase()
  )} ${inviteeStart.format("D")}, ${inviteeStart.format("YYYY")} | ${inviteeStart.format(
    "h:mma"
  )} - ${inviteeEnd.format("h:mma")} (${calEvent.attendees[0].timeZone})
  `;
};

export const getWho = (calEvent: CalendarEvent) => {
  const attendees = calEvent.attendees
    .map((attendee) => {
      return `
${attendee?.name || calEvent.language("guest")}
${attendee.email}
      `;
    })
    .join("");

  const organizer = `
${calEvent.organizer.name} - ${calEvent.language("organizer")}
${calEvent.organizer.email}
  `;

  return `
${calEvent.language("who")}
${organizer + attendees}
  `;
};

export const getAdditionalNotes = (calEvent: CalendarEvent) => {
  return `
${calEvent.language("additional_notes")}
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

  return providerName || calEvent.location;
};

export const getManageLink = (calEvent: CalendarEvent) => {
  return `
${calEvent.language("need_to_reschedule_or_cancel")}
${getCancelLink(calEvent)}
  `;
};

export const getUid = (calEvent: CalendarEvent): string => {
  return calEvent.uid ?? translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));
};

export const getCancelLink = (calEvent: CalendarEvent): string => {
  return BASE_URL + "/cancel/" + getUid(calEvent);
};

export const getRichDescription = (calEvent: CalendarEvent) => {
  return `
  ${getWhat(calEvent)}
  ${getWhen(calEvent)}
  ${getWho(calEvent)}
  ${getLocation(calEvent)}
  ${getAdditionalNotes(calEvent)}
  ${getManageLink(calEvent)}
  `;
};
