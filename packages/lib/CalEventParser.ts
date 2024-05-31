import type { TFunction } from "next-i18next";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";

import { WEBAPP_URL } from "./constants";
import getLabelValueMapFromResponses from "./getLabelValueMapFromResponses";

const translator = short();

// The odd indentation in this file is necessary because otherwise the leading tabs will be applied into the event description.

export const getWhat = (calEvent: CalendarEvent, t: TFunction) => {
  return `
${t("what")}:
${calEvent.title}
  `;
};

export const getWhen = (calEvent: CalendarEvent, t: TFunction) => {
  return calEvent.seatsPerTimeSlot
    ? `
${t("organizer_timezone")}:
${calEvent.organizer.timeZone}
  `
    : `
${t("invitee_timezone")}:
${calEvent.attendees[0].timeZone}
  `;
};

export const getWho = (calEvent: CalendarEvent, t: TFunction) => {
  let attendeesFromCalEvent = [...calEvent.attendees];
  if (calEvent.seatsPerTimeSlot && !calEvent.seatsShowAttendees) {
    attendeesFromCalEvent = [];
  }
  const attendees = attendeesFromCalEvent
    .map((attendee) => {
      return `
${attendee?.name || t("guest")}
${attendee.email}
      `;
    })
    .join("");

  const organizer = `
${calEvent.organizer.name} - ${t("organizer")}
${calEvent.organizer.email}
  `;

  const teamMembers = calEvent.team?.members
    ? calEvent.team.members.map((member) => {
        return `
${member.name} - ${t("team_member")}
${member.email}
    `;
      })
    : [];

  return `
${t("who")}:
${organizer + attendees + teamMembers.join("")}
  `;
};

export const getAdditionalNotes = (calEvent: CalendarEvent, t: TFunction) => {
  if (!calEvent.additionalNotes) {
    return "";
  }
  return `
${t("additional_notes")}:
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

export const getAppsStatus = (calEvent: CalendarEvent, t: TFunction) => {
  if (!calEvent.appsStatus) {
    return "";
  }
  return `\n${t("apps_status")}
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

export const getDescription = (calEvent: CalendarEvent, t: TFunction) => {
  if (!calEvent.description) {
    return "";
  }
  return `\n${t("description")}
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

export const getBookingUrl = (calEvent: CalendarEvent) => {
  if (calEvent.platformClientId) {
    if (!calEvent.platformBookingUrl) return "";
    return `${calEvent.platformBookingUrl}/${getUid(calEvent)}?slug=${calEvent.type}&username=${
      calEvent.organizer.username
    }&changes=true`;
  }

  return `${calEvent.bookerUrl ?? WEBAPP_URL}/booking/${getUid(calEvent)}?changes=true`;
};

export const getPlatformManageLink = (calEvent: CalendarEvent, t: TFunction) => {
  const shouldDisplayReschedule = !calEvent.recurringEvent && calEvent.platformRescheduleUrl;
  let res =
    calEvent.platformBookingUrl || shouldDisplayReschedule || calEvent.platformCancelUrl
      ? `${t("need_to_reschedule_or_cancel")} `
      : ``;
  if (calEvent.platformBookingUrl) {
    res += `Check Here: ${calEvent.platformBookingUrl}/${getUid(calEvent)}?slug=${calEvent.type}&username=${
      calEvent.organizer.username
    }&changes=true${calEvent.platformCancelUrl || shouldDisplayReschedule ? ` ${t("or_lowercase")} ` : ""}`;
  }
  if (calEvent.platformCancelUrl) {
    res += `${t("cancel")}: ${getCancelLink(calEvent)}`;
  }

  if (!calEvent.recurringEvent && calEvent.platformRescheduleUrl) {
    res += `${calEvent.platformCancelUrl ? ` ${t("or_lowercase")} ` : ""}${t(
      "reschedule"
    )}: ${getRescheduleLink(calEvent)}`;
  }

  return res;
};

export const getManageLink = (calEvent: CalendarEvent, t: TFunction) => {
  if (calEvent.platformClientId) {
    return getPlatformManageLink(calEvent, t);
  }

  return `${t("need_to_reschedule_or_cancel")} ${calEvent.bookerUrl ?? WEBAPP_URL}/booking/${getUid(
    calEvent
  )}?changes=true`;
};

export const getPlatformCancelLink = (
  calEvent: CalendarEvent,
  bookingUid: string,
  seatUid?: string
): string => {
  if (calEvent.platformCancelUrl) {
    const platformCancelLink = new URL(`${calEvent.platformCancelUrl}/${bookingUid}`);
    platformCancelLink.searchParams.append("slug", calEvent.type);
    calEvent.organizer.username &&
      platformCancelLink.searchParams.append("username", calEvent.organizer.username);
    platformCancelLink.searchParams.append("cancel", "true");
    platformCancelLink.searchParams.append("allRemainingBookings", String(!!calEvent.recurringEvent));
    if (seatUid) platformCancelLink.searchParams.append("seatReferenceUid", seatUid);
    return platformCancelLink.toString();
  }
  return "";
};

export const getCancelLink = (calEvent: CalendarEvent): string => {
  const Uid = getUid(calEvent);
  const seatReferenceUid = getSeatReferenceId(calEvent);
  if (calEvent.platformClientId) {
    return getPlatformCancelLink(calEvent, Uid, seatReferenceUid);
  }

  const cancelLink = new URL(`${calEvent.bookerUrl ?? WEBAPP_URL}/booking/${Uid}`);
  cancelLink.searchParams.append("cancel", "true");
  cancelLink.searchParams.append("allRemainingBookings", String(!!calEvent.recurringEvent));
  if (seatReferenceUid) cancelLink.searchParams.append("seatReferenceUid", seatReferenceUid);
  return cancelLink.toString();
};

export const getPlatformRescheduleLink = (
  calEvent: CalendarEvent,
  bookingUid: string,
  seatUid?: string
): string => {
  if (calEvent.platformRescheduleUrl) {
    const platformRescheduleLink = new URL(
      `${calEvent.platformRescheduleUrl}/${seatUid ? seatUid : bookingUid}`
    );
    platformRescheduleLink.searchParams.append("slug", calEvent.type);
    calEvent.organizer.username &&
      platformRescheduleLink.searchParams.append("username", calEvent.organizer.username);
    platformRescheduleLink.searchParams.append("reschedule", "true");
    return platformRescheduleLink.toString();
  }
  return "";
};

export const getRescheduleLink = (calEvent: CalendarEvent): string => {
  const Uid = getUid(calEvent);
  const seatUid = getSeatReferenceId(calEvent);

  if (calEvent.platformClientId) {
    return getPlatformRescheduleLink(calEvent, Uid, seatUid);
  }

  return `${calEvent.bookerUrl ?? WEBAPP_URL}/reschedule/${seatUid ? seatUid : Uid}`;
};

export const getRichDescription = (
  calEvent: CalendarEvent,
  t_?: TFunction /*, attendee?: Person*/,
  includeAppStatus = false
) => {
  const t = t_ ?? calEvent.organizer.language.translate;

  return `
${getCancellationReason(calEvent, t)}
${getWhat(calEvent, t)}
${getWhen(calEvent, t)}
${getWho(calEvent, t)}
${t("where")}:
${getLocation(calEvent)}
${getDescription(calEvent, t)}
${getAdditionalNotes(calEvent, t)}
${getUserFieldsResponses(calEvent)}
${includeAppStatus ? getAppsStatus(calEvent, t) : ""}
${
  // TODO: Only the original attendee can make changes to the event
  // Guests cannot
  calEvent.seatsPerTimeSlot ? "" : getManageLink(calEvent, t)
}
${
  calEvent.paymentInfo
    ? `
${t("pay_now")}:
${calEvent.paymentInfo.link}
`
    : ""
}
  `.trim();
};

export const getCancellationReason = (calEvent: CalendarEvent, t: TFunction) => {
  if (!calEvent.cancellationReason) return "";
  return `
${t("cancellation_reason")}:
${calEvent.cancellationReason}
 `;
};

export const isDailyVideoCall = (calEvent: CalendarEvent): boolean => {
  return calEvent?.videoCallData?.type === "daily_video";
};

export const getPublicVideoCallUrl = (calEvent: CalendarEvent): string => {
  return `${WEBAPP_URL}/video/${getUid(calEvent)}`;
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
