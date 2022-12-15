import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";

import { WEBAPP_URL } from "./constants";

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
  if (!calEvent.additionalNotes) {
    return "";
  }
  return `
${calEvent.organizer.language.translate("additional_notes")}:
${calEvent.additionalNotes}
  `;
};

export const getCustomInputs = (calEvent: CalendarEvent) => {
  if (!calEvent.customInputs) {
    return "";
  }
  const customInputsString = Object.keys(calEvent.customInputs)
    .map((key) => {
      if (!calEvent.customInputs) return "";
      if (calEvent.customInputs[key] !== "") {
        return `
${key}:
${calEvent.customInputs[key]}
  `;
      }
    })
    .join("");

  return customInputsString;
};

export const getAppsStatus = (calEvent: CalendarEvent) => {
  if (!calEvent.appsStatus) {
    return "";
  }
  return `\n${calEvent.attendees[0].language.translate("apps_status")}
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
  return `\n${calEvent.attendees[0].language.translate("description")}
    ${calEvent.description}
    `;
};
export const getLocation = (calEvent: CalendarEvent) => {
  const meetingUrl = getVideoCallUrl(calEvent);
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
  return calEvent.uid ?? translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));
};

export const getManageLink = (calEvent: CalendarEvent) => {
  return `
${calEvent.organizer.language.translate("need_to_reschedule_or_cancel")}
${WEBAPP_URL + "/booking/" + getUid(calEvent) + "?changes=true"}
  `;
};

export const getCancelLink = (calEvent: CalendarEvent): string => {
  return (
    WEBAPP_URL + `/booking/${getUid(calEvent)}?cancel=true&allRemainingBookings=${!!calEvent.recurringEvent}`
  );
};

export const getRescheduleLink = (calEvent: CalendarEvent): string => {
  return WEBAPP_URL + "/reschedule/" + getUid(calEvent);
};

export const getRichDescription = (calEvent: CalendarEvent /*, attendee?: Person*/) => {
  const appUrl = "https://app.mento.co";
  const cancelationPolicyURL =
    "https://mentoteam.notion.site/Mento-Rescheduling-Cancelation-Policy-ea6ed8fa23fc41a8a4598070ef42fb53";

  return `
${getCancellationReason(calEvent)}
<b>${calEvent.organizer.language.translate("where")}:</b>
${getLocation(calEvent)}

<b>Prepare for your session</b>
🏔 <a href="${appUrl}/growth" target="_blank">Review your Growth Plan</a> to help think about what you'd like to work on during the upcoming session. If this is one of your first 3 sessions, don't worry about it — we'll start with some exploration and goal-setting.

✍️ <a href="${appUrl}/reflection" target="_blank">Take a Pre-Session Reflection</a> designed to inspire topics to discuss at your next 1:1.

<b>Questions?</b>
💬 <a href="${appUrl}" target="_blank">Message your coach</a> on Mento

<b>Running late?</b>
Coaching time is valuable. Please send your coach a message letting them know you're late. Your coach will wait for up to 10 minutes for you to arrive before considering it a <a href="${cancelationPolicyURL}" target="_blank">missed session</a>.

<b>Can't make it?</b>
📆 <a href="${getCancelLink(
    calEvent
  )}" target="_blank">Reschedule or cancel this session</a> you can reschedule or cancel your session up to 48 hours before the session time. If you need to cancel within 24hrs or missed a session, please read our <a href="${cancelationPolicyURL}" target="_blank">cancelation policy</a>.

<a href="${appUrl}/coaching" target="_blank">See and manage my Coaching Sessions</a> - <a href="${appUrl}" target="_blank">Go to my Mento dashboard</a>

${getAdditionalNotes(calEvent)}
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

export const getVideoCallUrl = (calEvent: CalendarEvent): string => {
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
