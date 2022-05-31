import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";
import rrule from "rrule";

import { getAppName } from "@calcom/app-store/utils";
import { getCancelLink } from "@calcom/lib/CalEventParser";
import { BASE_URL, IS_PRODUCTION } from "@calcom/lib/constants";
import type { CalendarEvent, Person, RecurringEvent } from "@calcom/types/Calendar";

import { BaseEmailHtml, Info } from "../components";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(toArray);

const LinkIcon = () => (
  <img
    src={IS_PRODUCTION ? BASE_URL + "/emails/linkIcon.png" : "https://app.cal.com/emails/linkIcon.png"}
    width="12px"
    alt=""
  />
);

function LocationInfo(props: { calEvent: CalendarEvent }) {
  const t = props.calEvent.attendees[0].language.translate;
  let providerName = props.calEvent.location && getAppName(props.calEvent.location);

  if (props.calEvent.location && props.calEvent.location.includes("integrations:")) {
    const location = props.calEvent.location.split(":")[1];
    providerName = location[0].toUpperCase() + location.slice(1);
  }

  // If location its a url, probably we should be validating it with a custom library
  if (props.calEvent.location && /^https?:\/\//.test(props.calEvent.location)) {
    providerName = props.calEvent.location;
  }

  if (props.calEvent.videoCallData) {
    const meetingId = props.calEvent.videoCallData.id;
    const meetingPassword = props.calEvent.videoCallData.password;
    const meetingUrl = props.calEvent.videoCallData.url;

    return (
      <Info
        label={t("where")}
        withSpacer
        description={
          <>
            {providerName}
            {meetingUrl && (
              <a
                href={meetingUrl}
                target="_blank"
                title={t("meeting_url")}
                style={{ color: "#3E3E3E" }}
                rel="noreferrer">
                <LinkIcon />
              </a>
            )}
          </>
        }
        extraInfo={
          <>
            {meetingId && (
              <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
                <>
                  {t("meeting_id")}: <span>{meetingId}</span>
                </>
              </div>
            )}
            {meetingPassword && (
              <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
                <>
                  {t("meeting_password")}: <span>{meetingPassword}</span>
                </>
              </div>
            )}
            {meetingUrl && (
              <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
                <>
                  {t("meeting_url")}:{" "}
                  <a href="${meetingUrl}" title={t("meeting_url")} style={{ color: "#3E3E3E" }}>
                    {meetingUrl}
                  </a>
                </>
              </div>
            )}
          </>
        }
      />
    );
  }

  if (props.calEvent.additionInformation?.hangoutLink) {
    const hangoutLink: string = props.calEvent.additionInformation.hangoutLink;

    return (
      <Info
        label={t("where")}
        withSpacer
        description={
          <>
            {providerName}
            {hangoutLink && (
              <a
                href={hangoutLink}
                target="_blank"
                title={t("meeting_url")}
                style={{ color: "#3E3E3E" }}
                rel="noreferrer">
                <LinkIcon />
              </a>
            )}
          </>
        }
        extraInfo={
          providerName === "Zoom" || providerName === "Google" ? (
            <p style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
              <>{t("meeting_url_provided_after_confirmed")}</>
            </p>
          ) : null
        }
      />
    );
  }

  return (
    <Info
      label={t("where")}
      withSpacer
      description={providerName || props.calEvent.location}
      extraInfo={
        providerName === "Zoom" || providerName === "Google" ? (
          <p style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
            <>{t("meeting_url_provided_after_confirmed")}</>
          </p>
        ) : null
      }
    />
  );
}

function getRecurringWhen(props: { calEvent: CalendarEvent; recurringEvent: RecurringEvent }) {
  const t = props.calEvent.attendees[0].language.translate;
  return props.recurringEvent?.count && props.recurringEvent?.freq
    ? ` - ${t("every_for_freq", {
        freq: t(`${rrule.FREQUENCIES[props.recurringEvent.freq].toString().toLowerCase()}`),
      })} ${props.recurringEvent.count} ${t(
        `${rrule.FREQUENCIES[props.recurringEvent.freq].toString().toLowerCase()}`,
        { count: props.recurringEvent.count }
      )}`
    : "";
}

function WhenInfo(props: { calEvent: CalendarEvent; recurringEvent: RecurringEvent }) {
  const t = props.calEvent.attendees[0].language.translate;

  function getInviteeStart(format: string) {
    return dayjs(props.calEvent.startTime).tz(props.calEvent.attendees[0].timeZone).format(format);
  }

  function getInviteeEnd(format: string) {
    return dayjs(props.calEvent.endTime).tz(props.calEvent.attendees[0].timeZone).format(format);
  }

  return (
    <div>
      <Info
        label={`${t("when")} ${getRecurringWhen(props)}`}
        description={
          <>
            {props.recurringEvent?.count ? `${t("starting")} ` : ""}
            {t(getInviteeStart("dddd").toLowerCase())}, {t(getInviteeStart("MMMM").toLowerCase())}{" "}
            {getInviteeStart("D")}, {getInviteeStart("YYYY")} | {getInviteeStart("h:mma")} -{" "}
            {getInviteeEnd("h:mma")}{" "}
            <span style={{ color: "#888888" }}>({props.calEvent.attendees[0].timeZone})</span>
          </>
        }
        withSpacer
      />
    </div>
  );
}

const PersonInfo = ({ name = "", email = "", role = "" }) => (
  <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
    {name} - {role}{" "}
    <span style={{ color: "#888888" }}>
      <a href={`mailto:${email}`} style={{ color: "#888888" }}>
        {email}
      </a>
    </span>
  </div>
);

function WhoInfo(props: { calEvent: CalendarEvent }) {
  const t = props.calEvent.attendees[0].language.translate;
  return (
    <Info
      label={t("who")}
      description={
        <>
          <PersonInfo
            name={props.calEvent.organizer.name}
            role={t("organizer")}
            email={props.calEvent.organizer.email}
          />
          {props.calEvent.attendees.map((attendee) => (
            <PersonInfo
              key={attendee.id || attendee.name}
              name={attendee.name}
              role={t("guest")}
              email={attendee.email}
            />
          ))}
        </>
      }
      withSpacer
    />
  );
}

function CustomInputs(props: { calEvent: CalendarEvent }) {
  const { customInputs } = props.calEvent;
  if (!customInputs) return null;

  return (
    <>
      {Object.keys(customInputs).map((key) =>
        customInputs[key] !== "" ? <Info key={key} label={key} description={`${customInputs[key]}`} /> : null
      )}
    </>
  );
}

function ManageLink(props: { calEvent: CalendarEvent; attendee: Person }) {
  // Only the original attendee can make changes to the event
  // Guests cannot
  if (props.attendee.email !== props.calEvent.attendees[0].email) return null;
  const t = props.attendee.language.translate;

  return (
    <div
      style={{
        fontFamily: "Roboto, Helvetica, sans-serif",
        fontSize: "16px",
        fontWeight: 500,
        lineHeight: "0px",
        textAlign: "left",
        color: "#3e3e3e",
      }}>
      <p>
        <>{t("need_to_reschedule_or_cancel")}</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <a href={getCancelLink(props.calEvent)} style={{ color: "#3e3e3e" }}>
          <>{t("manage_this_event")}</>
        </a>
      </p>
    </div>
  );
}

export const AttendeeScheduledEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    recurringEvent: RecurringEvent;
  } & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const [firstAttendee] = props.calEvent.attendees;
  const t = firstAttendee.language.translate;

  function getInviteeStart(format: string) {
    return dayjs(props.calEvent.startTime).tz(firstAttendee.timeZone).format(format);
  }

  function getInviteeEnd(format: string) {
    return dayjs(props.calEvent.endTime).tz(firstAttendee.timeZone).format(format);
  }

  const headTitle = t(props.headTitle || "confirmed_event_type_subject", {
    eventType: props.calEvent.type,
    name: props.calEvent.team?.name || props.calEvent.organizer.name,
    date: `${getInviteeStart("h:mma")} - ${getInviteeEnd("h:mma")}, ${t(
      getInviteeStart("dddd").toLowerCase()
    )}, ${t(getInviteeStart("MMMM").toLowerCase())} ${getInviteeStart("D")}, ${getInviteeStart("YYYY")}`,
  });

  return (
    <BaseEmailHtml
      headerType={props.headerType || "checkCircle"}
      headTitle={props.headTitle || headTitle}
      title={t(
        props.title
          ? props.title
          : props.recurringEvent?.count
          ? "your_event_has_been_scheduled_recurring"
          : "your_event_has_been_scheduled"
      )}
      callToAction={
        props.callToAction !== null && <ManageLink attendee={props.attendee} calEvent={props.calEvent} />
      }
      subtitle={t(props.subtitle || "emailed_you_and_any_other_attendees")}>
      <Info label={t("what")} description={props.calEvent.type} />
      <WhenInfo calEvent={props.calEvent} recurringEvent={props.recurringEvent} />
      <WhoInfo calEvent={props.calEvent} />
      <LocationInfo calEvent={props.calEvent} />
      <Info label={t("description")} description={props.calEvent.description} withSpacer />
      <Info label={t("additional_notes")} description={props.calEvent.additionalNotes} withSpacer />
      <CustomInputs calEvent={props.calEvent} />
      <Info label={t("cancellation_reason")} description={props.calEvent.cancellationReason} withSpacer />
      <Info label={t("rejection_reason")} description={props.calEvent.rejectionReason} withSpacer />
    </BaseEmailHtml>
  );
};

export default AttendeeScheduledEmail;
