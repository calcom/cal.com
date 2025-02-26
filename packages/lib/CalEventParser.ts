import type { TFunction } from "next-i18next";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { WEBAPP_URL } from "./constants";
import getLabelValueMapFromResponses from "./getLabelValueMapFromResponses";
import isSmsCalEmail from "./isSmsCalEmail";

const translator = short();

// The odd indentation in this file is necessary because otherwise the leading tabs will be applied into the event description.

export const getWhat = (calEvent: Pick<CalendarEvent, "title">, t: TFunction) => {
  return `${t("what")}:\n${calEvent.title}`;
};

export const getWhen = (
  calEvent: Pick<CalendarEvent, "organizer" | "attendees" | "seatsPerTimeSlot">,
  t: TFunction
) => {
  const organizerTimezone = calEvent.organizer?.timeZone ?? "UTC";
  const defaultTimezone = organizerTimezone;
  const attendeeTimezone = calEvent.attendees?.[0]?.timeZone ?? defaultTimezone;

  return calEvent.seatsPerTimeSlot
    ? `${t("organizer_timezone")}:\n${organizerTimezone}`
    : `${t("invitee_timezone")}:\n${attendeeTimezone}`;
};

export const getWho = (
  calEvent: Pick<
    CalendarEvent,
    "attendees" | "seatsPerTimeSlot" | "seatsShowAttendees" | "organizer" | "team"
  >,
  t: TFunction
) => {
  let attendeesFromCalEvent = [...calEvent.attendees];
  if (calEvent.seatsPerTimeSlot && !calEvent.seatsShowAttendees) {
    attendeesFromCalEvent = [];
  }
  const attendees = attendeesFromCalEvent
    .map(
      (attendee) =>
        `${attendee?.name || t("guest")}\n${
          !isSmsCalEmail(attendee.email) ? attendee.email : attendee.phoneNumber
        }`
    )
    .join("\n");

  const organizer = `${calEvent.organizer.name} - ${t("organizer")}\n${calEvent.organizer.email}`;

  const teamMembers = calEvent.team?.members
    ? calEvent.team.members
        .map((member) => `${member.name} - ${t("team_member")}\n${member.email}`)
        .join("\n")
    : [];

  return `${t("who")}:\n${organizer}${attendees ? `\n${attendees}` : ""}${
    teamMembers.length ? `\n${teamMembers}` : ""
  }`;
};

export const getAdditionalNotes = (calEvent: Pick<CalendarEvent, "additionalNotes">, t: TFunction) => {
  if (!calEvent.additionalNotes) {
    return "";
  }
  return `${t("additional_notes")}:\n${calEvent.additionalNotes}`;
};

export const getUserFieldsResponses = (calEvent: Parameters<typeof getLabelValueMapFromResponses>[0]) => {
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

export const getAppsStatus = (calEvent: Pick<CalendarEvent, "appsStatus">, t: TFunction) => {
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

export const getDescription = (calEvent: Pick<CalendarEvent, "description">, t: TFunction) => {
  if (!calEvent.description) {
    return "";
  }
  const plainText = calEvent.description.replace(/<\/?[^>]+(>|$)/g, "").replace(/_/g, " ");
  return `${t("description")}\n${plainText}`;
};

export const getLocation = (
  calEvent: Parameters<typeof getVideoCallUrlFromCalEvent>[0] & Parameters<typeof getProviderName>[0]
) => {
  const meetingUrl = getVideoCallUrlFromCalEvent(calEvent);
  if (meetingUrl) {
    return meetingUrl;
  }
  const providerName = getProviderName(calEvent);
  return providerName || calEvent.location || "";
};

export const getProviderName = (calEvent: Pick<CalendarEvent, "location">): string => {
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

export const getUid = (calEvent: Pick<CalendarEvent, "uid">): string => {
  const uid = calEvent.uid;
  return uid ?? translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));
};

const getSeatReferenceId = (calEvent: Pick<CalendarEvent, "attendeeSeatId">): string => {
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

export const getPlatformManageLink = (
  calEvent: Parameters<typeof getCancelLink>[0] &
    Parameters<typeof getRescheduleLink>[0]["calEvent"] &
    Pick<CalendarEvent, "platformBookingUrl" | "platformRescheduleUrl" | "team">,
  t: TFunction
) => {
  const shouldDisplayReschedule = !calEvent.recurringEvent && calEvent.platformRescheduleUrl;
  let res =
    calEvent.platformBookingUrl || shouldDisplayReschedule || calEvent.platformCancelUrl
      ? `${t("need_to_reschedule_or_cancel")} `
      : ``;
  if (calEvent.platformBookingUrl) {
    res += `Check Here: ${calEvent.platformBookingUrl}/${getUid(calEvent)}?slug=${calEvent.type}&username=${
      calEvent.organizer.username
    }${calEvent?.team ? `&teamId=${calEvent.team.id}` : ""}&changes=true${
      calEvent.platformCancelUrl || shouldDisplayReschedule ? ` ${t("or_lowercase")} ` : ""
    }`;
  }
  if (calEvent.platformCancelUrl) {
    res += `${t("cancel")}: ${getCancelLink(calEvent)}`;
  }

  if (!calEvent.recurringEvent && calEvent.platformRescheduleUrl) {
    res += `${calEvent.platformCancelUrl ? ` ${t("or_lowercase")} ` : ""}${t(
      "reschedule"
    )}: ${getRescheduleLink({ calEvent })}`;
  }

  return res;
};

export const getManageLink = (
  calEvent: Parameters<typeof getPlatformManageLink>[0] &
    Pick<CalendarEvent, "platformClientId" | "bookerUrl">,
  t: TFunction
) => {
  if (calEvent.platformClientId) {
    return getPlatformManageLink(calEvent, t);
  }

  return `${t("need_to_reschedule_or_cancel")} ${calEvent.bookerUrl ?? WEBAPP_URL}/booking/${getUid(
    calEvent
  )}?changes=true`;
};

export const getPlatformCancelLink = (
  calEvent: Pick<CalendarEvent, "platformCancelUrl" | "type" | "organizer" | "recurringEvent" | "team">,
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
    if (calEvent?.team) platformCancelLink.searchParams.append("teamId", calEvent.team.id.toString());
    return platformCancelLink.toString();
  }
  return "";
};

export const getCancelLink = (
  calEvent: Parameters<typeof getUid>[0] &
    Parameters<typeof getSeatReferenceId>[0] &
    Parameters<typeof getPlatformCancelLink>[0] &
    Pick<CalendarEvent, "platformClientId" | "bookerUrl">,
  attendee?: Person
): string => {
  const Uid = getUid(calEvent);
  const seatReferenceUid = getSeatReferenceId(calEvent);
  if (calEvent.platformClientId) {
    return getPlatformCancelLink(calEvent, Uid, seatReferenceUid);
  }

  const cancelLink = new URL(`${calEvent.bookerUrl ?? WEBAPP_URL}/booking/${Uid}`);
  cancelLink.searchParams.append("cancel", "true");
  cancelLink.searchParams.append("allRemainingBookings", String(!!calEvent.recurringEvent));
  if (attendee?.email) {
    cancelLink.searchParams.append("cancelledBy", attendee.email);
  }
  if (seatReferenceUid) cancelLink.searchParams.append("seatReferenceUid", seatReferenceUid);
  return cancelLink.toString();
};

export const getPlatformRescheduleLink = (
  calEvent: Pick<CalendarEvent, "platformRescheduleUrl" | "type" | "organizer" | "team">,
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
    if (calEvent?.team) platformRescheduleLink.searchParams.append("teamId", calEvent.team.id.toString());
    return platformRescheduleLink.toString();
  }
  return "";
};

export const getRescheduleLink = ({
  calEvent,
  allowRescheduleForCancelledBooking = false,
  attendee,
}: {
  calEvent: Parameters<typeof getUid>[0] &
    Parameters<typeof getSeatReferenceId>[0] &
    Parameters<typeof getPlatformRescheduleLink>[0] &
    Pick<CalendarEvent, "bookerUrl" | "platformClientId">;
  allowRescheduleForCancelledBooking?: boolean;
  attendee?: Person;
}): string => {
  const Uid = getUid(calEvent);
  const seatUid = getSeatReferenceId(calEvent);

  if (calEvent.platformClientId) {
    return getPlatformRescheduleLink(calEvent, Uid, seatUid);
  }

  const url = new URL(`${calEvent.bookerUrl ?? WEBAPP_URL}/reschedule/${seatUid ? seatUid : Uid}`);
  if (allowRescheduleForCancelledBooking) {
    url.searchParams.append("allowRescheduleForCancelledBooking", "true");
  }
  if (attendee?.email) {
    url.searchParams.append("rescheduledBy", attendee.email);
  }

  return url.toString();
};

type RichDescriptionCalEvent = Parameters<typeof getCancellationReason>[0] &
  Parameters<typeof getWhat>[0] &
  Parameters<typeof getWhen>[0] &
  Parameters<typeof getLocation>[0] &
  Parameters<typeof getDescription>[0] &
  Parameters<typeof getAdditionalNotes>[0] &
  Parameters<typeof getUserFieldsResponses>[0] &
  Parameters<typeof getAppsStatus>[0] &
  Parameters<typeof getManageLink>[0] &
  Pick<CalendarEvent, "organizer" | "paymentInfo">;

export const getRichDescription = (
  calEvent: RichDescriptionCalEvent,
  t_?: TFunction /*, attendee?: Person*/,
  includeAppStatus = false
) => {
  const t = t_ ?? calEvent.organizer.language.translate;

  // Join all parts with single newlines and remove extra whitespace
  const parts = [
    getCancellationReason(calEvent, t),
    getWhat(calEvent, t),
    getWhen(calEvent, t),
    getWho(calEvent, t),
    `${t("where")}:\n${getLocation(calEvent)}`,
    getDescription(calEvent, t),
    getAdditionalNotes(calEvent, t),
    getUserFieldsResponses(calEvent),
    includeAppStatus ? getAppsStatus(calEvent, t) : "",
    // TODO: Only the original attendee can make changes to the event
    // Guests cannot
    calEvent.seatsPerTimeSlot ? "" : getManageLink(calEvent, t),
    calEvent.paymentInfo ? `${t("pay_now")}:\n${calEvent.paymentInfo.link}` : "",
  ]
    .filter(Boolean) // Remove empty strings
    .join("\n\n") // Double newline between major sections
    .replace(/\n{3,}/g, "\n\n") // Ensure no more than double newlines
    .trim();

  return parts;
};

export const getCancellationReason = (calEvent: Pick<CalendarEvent, "cancellationReason">, t: TFunction) => {
  if (!calEvent.cancellationReason) return "";
  return `${t("cancellation_reason")}:\n${calEvent.cancellationReason}`;
};

export const isDailyVideoCall = (calEvent: Pick<CalendarEvent, "videoCallData">): boolean => {
  return calEvent?.videoCallData?.type === "daily_video";
};

export const getPublicVideoCallUrl = (calEvent: Pick<CalendarEvent, "uid">): string => {
  return `${WEBAPP_URL}/video/${getUid(calEvent)}`;
};

export const getVideoCallUrlFromCalEvent = (
  calEvent: Parameters<typeof getPublicVideoCallUrl>[0] &
    Pick<CalendarEvent, "videoCallData" | "additionalInformation" | "location">
): string => {
  if (calEvent.videoCallData) {
    if (isDailyVideoCall(calEvent)) {
      return getPublicVideoCallUrl(calEvent);
    }
    return calEvent.videoCallData.url;
  }
  if (calEvent.additionalInformation?.hangoutLink) {
    return calEvent.additionalInformation.hangoutLink;
  }
  if (calEvent.location?.startsWith("http")) {
    return calEvent.location;
  }
  return "";
};

export const getVideoCallPassword = (calEvent: CalendarEvent): string => {
  return isDailyVideoCall(calEvent) ? "" : calEvent?.videoCallData?.password ?? "";
};
