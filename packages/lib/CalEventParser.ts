import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";

import { WEBAPP_URL } from "./constants";
import getLabelValueMapFromResponses from "./getLabelValueMapFromResponses";

const translator = short();

// The odd indentation in this file is necessary because otherwise the leading tabs will be applied into the event description.

export const getWhat = (calEvent: CalendarEvent) => {
  return `
${calEvent.organizer.language.translate("what")}:
${calEvent.type}
  `;
};

export const getWhen = (calEvent: CalendarEvent) => {
  return calEvent.seatsPerTimeSlot
    ? `
${calEvent.organizer.language.translate("organizer_timezone")}:
${calEvent.organizer.timeZone}
  `
    : `
${calEvent.organizer.language.translate("invitee_timezone")}:
${calEvent.attendees[0].timeZone}
  `;
};

export const getWho = (calEvent: CalendarEvent) => {
  let attendeesFromCalEvent = [...calEvent.attendees];
  if (calEvent.seatsPerTimeSlot && !calEvent.seatsShowAttendees) {
    attendeesFromCalEvent = [];
  }
  const attendees = attendeesFromCalEvent
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

  const teamMembers = calEvent.team?.members
    ? calEvent.team.members.map((member) => {
        return `
${member.name} - ${calEvent.organizer.language.translate("team_member")} 
${member.email}
    `;
      })
    : [];

  return `
${calEvent.organizer.language.translate("who")}:
${organizer + attendees + teamMembers.join("")}
  `;
};

export const getAdditionalNotes = (calEvent: CalendarEvent) => {
  if (!calEvent.additionalNotes) {
    return "";
  }
  return `
${calEvent.organizer.language.translate("additional_notes")}:
${calEvent.additionalNotes}
  `;
};

export const getUserFieldsResponses = (calEvent: CalendarEvent) => {
  const labelValueMap = getLabelValueMapFromResponses(calEvent);

  if (!labelValueMap) {
    return "";
  }
  const responsesString = Object.keys(labelValueMap)
    .map((key) => {
      if (!labelValueMap) return "";
      if (labelValueMap[key] !== "") {
        return `
${key}:
${labelValueMap[key]}
  `;
      }
    })
    .join("");

  return responsesString;
};

export const getAppsStatus = (calEvent: CalendarEvent) => {
  if (!calEvent.appsStatus) {
    return "";
  }
  return `\n${calEvent.organizer.language.translate("apps_status")}
      ${calEvent.appsStatus.map((app) => {
        return `\n- ${app.appName} ${
          app.success >= 1 ? `✅ ${app.success > 1 ? `(x${app.success})` : ""}` : ""
        }${
          app.warnings && app.warnings.length >= 1 ? app.warnings.map((warning) => `\n   - ${warning}`) : ""
        } ${app.failures && app.failures >= 1 ? `❌ ${app.failures > 1 ? `(x${app.failures})` : ""}` : ""} ${
          app.errors && app.errors.length >= 1 ? app.errors.map((error) => `\n   - ${error}`) : ""
        }`;
      })}
    `;
};

export const getDescription = (calEvent: CalendarEvent) => {
  if (!calEvent.description) {
    return "";
  }
  return `\n${calEvent.organizer.language.translate("description")}
    ${calEvent.description}
    `;
};
export const getLocation = (calEvent: CalendarEvent) => {
  const meetingUrl = getVideoCallUrlFromCalEvent(calEvent);
  if (meetingUrl) {
    return meetingUrl;
  }
  const providerName = getProviderName(calEvent);
  return providerName || calEvent.location || "";
};

export const getProviderName = (calEvent: CalendarEvent): string => {
  // TODO: use getAppName from @calcom/app-store
  if (calEvent.location && calEvent.location.includes("integrations:")) {
    let location = calEvent.location.split(":")[1];
    if (location === "daily") {
      location = "Cal Video";
    }
    return location[0].toUpperCase() + location.slice(1);
  }
  // If location its a url, probably we should be validating it with a custom library
  if (calEvent.location && /^https?:\/\//.test(calEvent.location)) {
    return calEvent.location;
  }
  return "";
};

export const getUid = (calEvent: CalendarEvent): string => {
  const uid = calEvent.uid;
  return uid ?? translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));
};

const getSeatReferenceId = (calEvent: CalendarEvent): string => {
  return calEvent.attendeeSeatId ? calEvent.attendeeSeatId : "";
};

export const getManageLink = (calEvent: CalendarEvent) => {
  return `
${calEvent.organizer.language.translate("need_to_reschedule_or_cancel")}
${WEBAPP_URL + "/booking/" + getUid(calEvent) + "?changes=true"}
  `;
};

export const getCancelLink = (calEvent: CalendarEvent): string => {
  const cancelLink = new URL(WEBAPP_URL + `/booking/${getUid(calEvent)}`);
  cancelLink.searchParams.append("cancel", "true");
  cancelLink.searchParams.append("allRemainingBookings", String(!!calEvent.recurringEvent));
  const seatReferenceUid = getSeatReferenceId(calEvent);
  if (seatReferenceUid) cancelLink.searchParams.append("seatReferenceUid", seatReferenceUid);
  return cancelLink.toString();
};

export const getRescheduleLink = (calEvent: CalendarEvent): string => {
  const Uid = getUid(calEvent);
  const seatUid = getSeatReferenceId(calEvent);

  return `${WEBAPP_URL}/reschedule/${seatUid ? seatUid : Uid}`;
};

export const getRichDescription = (calEvent: CalendarEvent /*, attendee?: Person*/) => {
  return `
${getCancellationReason(calEvent)}
${getWhat(calEvent)}
${getWhen(calEvent)}
${getWho(calEvent)}
${calEvent.organizer.language.translate("where")}:
${getLocation(calEvent)}
${getDescription(calEvent)}
${getAdditionalNotes(calEvent)}
${getUserFieldsResponses(calEvent)}
${getAppsStatus(calEvent)}
${
  // TODO: Only the original attendee can make changes to the event
  // Guests cannot
  !calEvent.seatsPerTimeSlot && getManageLink(calEvent)
}
${
  calEvent.paymentInfo
    ? `
${calEvent.organizer.language.translate("pay_now")}:
${calEvent.paymentInfo.link}
`
    : ""
}
  `.trim();
};

export const getCancellationReason = (calEvent: CalendarEvent) => {
  if (!calEvent.cancellationReason) return "";
  return `
${calEvent.organizer.language.translate("cancellation_reason")}:
${calEvent.cancellationReason}
 `;
};

export const isDailyVideoCall = (calEvent: CalendarEvent): boolean => {
  return calEvent?.videoCallData?.type === "daily_video";
};

export const getPublicVideoCallUrl = (calEvent: CalendarEvent): string => {
  return WEBAPP_URL + "/video/" + getUid(calEvent);
};

export const getVideoCallUrlFromCalEvent = (calEvent: CalendarEvent): string => {
  if (calEvent.videoCallData) {
    if (isDailyVideoCall(calEvent)) {
      return getPublicVideoCallUrl(calEvent);
    }
    return calEvent.videoCallData.url;
  }
  if (calEvent.additionalInformation?.hangoutLink) {
    return calEvent.additionalInformation.hangoutLink;
  }
  return "";
};

export const getVideoCallPassword = (calEvent: CalendarEvent): string => {
  return isDailyVideoCall(calEvent) ? "" : calEvent?.videoCallData?.password ?? "";
};
