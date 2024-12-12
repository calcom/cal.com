import type { TFunction } from "next-i18next";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import type { CalendarEvent, Person, TeamMember } from "@calcom/types/Calendar";

import { WEBAPP_URL } from "./constants";
import getLabelValueMapFromResponses from "./getLabelValueMapFromResponses";
import isSmsCalEmail from "./isSmsCalEmail";

const translator = short();

export const getWhat = (calEvent: Pick<CalendarEvent, "title">, t: TFunction): string => {
  return `${t("what")}:\n${calEvent.title.trim()}`;
};

export const getWhen = (
  calEvent: Pick<CalendarEvent, "organizer" | "attendees" | "seatsPerTimeSlot">,
  t: TFunction
): string => {
  return calEvent.seatsPerTimeSlot
    ? `${t("organizer_timezone")}:\n${calEvent.organizer.timeZone.trim()}`
    : `${t("invitee_timezone")}:\n${calEvent.attendees[0].timeZone.trim()}`;
};

const getAttendeesText = (t: TFunction, hideAttendees: boolean, attendees?: Person[]): string => {
  if (hideAttendees || !attendees || attendees.length === 0) return "";

  /*
    This will generate something like this:
    John Doe
    john.doe@acme.com

    Nic Doe
    nic.doe@acme.com

    jane.doe@acme.com - Guest

    simon.doe@acme.com - Guest
  */
  return attendees
    .map((attendee) => {
      const { name, email, phoneNumber } = attendee;
      const label = !isSmsCalEmail(email) ? `${email}` : `${phoneNumber}`;
      if (name) return `${name.trim()}\n${label.trim()}`;
      // Guests don't have a name.
      return `${label.trim()} - ${t("guest")}`;
    })
    .join("\n\n");
};

const getTeamMembersText = (t: TFunction, teamMembers?: TeamMember[]): string => {
  if (!teamMembers || teamMembers.length === 0) return "";

  /*
    This will generate something like this:
    John Doe - Team Member
    john.doe@acme.com

    Jane Doe - Team Member
    jane.doe@acme.com
  */
  return teamMembers
    .map((member) => `${member.name.trim()} - ${t("team_member")}\n${member.email.trim()}`)
    .join("\n\n");
};

export const getWho = (
  calEvent: Pick<
    CalendarEvent,
    "attendees" | "seatsPerTimeSlot" | "seatsShowAttendees" | "organizer" | "team"
  >,
  t: TFunction
): string => {
  const { attendees, organizer, team, seatsPerTimeSlot, seatsShowAttendees } = calEvent;

  const organizerText = `${organizer.name} - ${t("organizer")}\n${organizer.email}`;
  const hideAttendees = Boolean(seatsPerTimeSlot && !seatsShowAttendees);
  const attendeesText = getAttendeesText(t, hideAttendees, attendees);
  const teamMembersText = getTeamMembersText(t, team?.members);
  const whoTexts = [organizerText, teamMembersText, attendeesText].filter(Boolean).join("\n\n");

  return `${t("who")}:\n${whoTexts}`;
};

export const getAdditionalNotes = (
  calEvent: Pick<CalendarEvent, "additionalNotes">,
  t: TFunction
): string => {
  if (!calEvent.additionalNotes) return "";
  return `${t("additional_notes")}:\n${calEvent.additionalNotes.trim()}`;
};

export const getUserFieldsResponses = (
  calEvent: Parameters<typeof getLabelValueMapFromResponses>[0]
): string => {
  const labelValueMap = getLabelValueMapFromResponses(calEvent);

  if (!labelValueMap) return "";

  return Object.keys(labelValueMap)
    .map((key) => (labelValueMap[key] !== "" ? `${key}:\n${labelValueMap[key]}` : ""))
    .join("\n\n");
};

export const getAppsStatus = (calEvent: Pick<CalendarEvent, "appsStatus">, t: TFunction): string => {
  if (!calEvent.appsStatus) return "";

  return `${t("apps_status")}:
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

export const getDescription = (calEvent: Pick<CalendarEvent, "description">, t: TFunction): string => {
  if (!calEvent.description) return "";

  return `${t("description")}:\n${calEvent.description.trim()}`;
};

export const getLocation = (
  calEvent: Parameters<typeof getVideoCallUrlFromCalEvent>[0] & Parameters<typeof getProviderName>[0]
): string => {
  const meetingUrl = getVideoCallUrlFromCalEvent(calEvent);
  if (meetingUrl) return meetingUrl;

  const providerName = getProviderName(calEvent);
  return (providerName || calEvent.location || "").trim();
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

export const getBookingUrl = (calEvent: CalendarEvent): string => {
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
): string => {
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
): string => {
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

  const location = getLocation(calEvent);
  const locationField = location.length > 0 ? `${t("where")}:\n${location}` : "";

  return [
    getCancellationReason(calEvent, t),
    getWhat(calEvent, t),
    getWhen(calEvent, t),
    getWho(calEvent, t),
    locationField,
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
    .join("\n\n");
};

export const getCancellationReason = (
  calEvent: Pick<CalendarEvent, "cancellationReason">,
  t: TFunction
): string => {
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
