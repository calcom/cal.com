import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";
import rrule from "rrule";

import { getAppName } from "@calcom/app-store/utils";
import { BASE_URL, IS_PRODUCTION } from "@calcom/lib/constants";
import type { CalendarEvent, Person, RecurringEvent } from "@calcom/types/Calendar";

import { BaseEmailHtml } from "../components/BaseEmailHtml";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(toArray);

function Info(props: {
  label: string;
  description: React.ReactNode | undefined | null;
  extraInfo?: React.ReactNode;
  withSpacer?: boolean;
}) {
  if (!props.description) return null;
  return (
    <>
      {props.withSpacer && <Spacer />}
      <div style={{ lineHeight: "6px" }}>
        <p style={{ color: "#494949" }}>{props.label}</p>
        <p style={{ color: "#494949", fontWeight: 400, lineHeight: "24px", whiteSpace: "pre-wrap" }}>
          {props.description}
        </p>
        {props.extraInfo}
      </div>
    </>
  );
}

const Spacer = () => <p style={{ height: 6 }} />;

const LinkIcon = () => (
  <img
    src={IS_PRODUCTION ? BASE_URL + "/emails/linkIcon.png" : "https://app.cal.com/emails/linkIcon.png"}
    width="12px"
    alt=""
  />
);

function LocationInfo(props: { calEvent: CalendarEvent }) {
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
        label={props.calEvent.attendees[0].language.translate("where")}
        description={
          <>
            {providerName}
            {meetingUrl && (
              <a
                href={meetingUrl}
                target="_blank"
                title={props.calEvent.attendees[0].language.translate("meeting_url")}
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
                  {props.calEvent.attendees[0].language.translate("meeting_id")}: <span>{meetingId}</span>
                </>
              </div>
            )}
            {meetingPassword && (
              <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
                <>
                  {props.calEvent.attendees[0].language.translate("meeting_password")}:{" "}
                  <span>{meetingPassword}</span>
                </>
              </div>
            )}
            {meetingUrl && (
              <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
                <>
                  {props.calEvent.attendees[0].language.translate("meeting_url")}:{" "}
                  <a
                    href="${meetingUrl}"
                    title={props.calEvent.attendees[0].language.translate("meeting_url")}
                    style={{ color: "#3E3E3E" }}>
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
        label={props.calEvent.attendees[0].language.translate("where")}
        description={
          <>
            {providerName}
            {hangoutLink && (
              <a
                href={hangoutLink}
                target="_blank"
                title={props.calEvent.attendees[0].language.translate("meeting_url")}
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
              <>{props.calEvent.organizer.language.translate("meeting_url_provided_after_confirmed")}</>
            </p>
          ) : null
        }
      />
    );
  }

  return (
    <Info
      label={props.calEvent.attendees[0].language.translate("where")}
      description={providerName || props.calEvent.location}
      extraInfo={
        providerName === "Zoom" || providerName === "Google" ? (
          <p style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
            <>{props.calEvent.organizer.language.translate("meeting_url_provided_after_confirmed")}</>
          </p>
        ) : null
      }
    />
  );
}

function getRecurringWhen(props): string {
  return props.recurringEvent?.freq
    ? ` - ${props.calEvent.attendees[0].language.translate("every_for_freq", {
        freq: props.calEvent.attendees[0].language.translate(
          `${rrule.FREQUENCIES[props.recurringEvent.freq].toString().toLowerCase()}`
        ),
      })} ${props.recurringEvent.count} ${props.calEvent.attendees[0].language.translate(
        `${rrule.FREQUENCIES[props.recurringEvent.freq].toString().toLowerCase()}`,
        { count: props.recurringEvent.count }
      )}`
    : "";
}

function WhenInfo(props: { calEvent: CalendarEvent; recurringEvent: RecurringEvent }) {
  function getInviteeStart(format: string) {
    return dayjs(props.calEvent.startTime).tz(props.calEvent.attendees[0].timeZone).format(format);
  }

  function getInviteeEnd(format: string) {
    return dayjs(props.calEvent.endTime).tz(props.calEvent.attendees[0].timeZone).format(format);
  }

  return (
    <div>
      <Info
        label={`${props.calEvent.attendees[0].language.translate("when")} ${
          props.recurringEvent?.count ? getRecurringWhen(props) : ""
        }`}
        description={
          <>
            {props.recurringEvent?.count
              ? `${props.calEvent.attendees[0].language.translate("starting")} `
              : ""}
            {props.calEvent.attendees[0].language.translate(getInviteeStart("dddd").toLowerCase())},{" "}
            {props.calEvent.attendees[0].language.translate(getInviteeStart("MMMM").toLowerCase())}{" "}
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
  return (
    <Info
      label={props.calEvent.attendees[0].language.translate("who")}
      description={
        <>
          <PersonInfo
            name={props.calEvent.organizer.name}
            role={props.calEvent.attendees[0].language.translate("organizer")}
            email={props.calEvent.organizer.email}
          />
          {props.calEvent.attendees.map((attendee) => (
            <PersonInfo
              key={attendee.id || attendee.name}
              name={attendee.name}
              role={props.calEvent.attendees[0].language.translate("guest")}
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

export const AttendeeScheduledEmail = (props: {
  calEvent: CalendarEvent;
  attendee: Person;
  recurringEvent: RecurringEvent;
}) => {
  const [firstAttendee] = props.calEvent.attendees;

  function getInviteeStart(format: string) {
    return dayjs(props.calEvent.startTime).tz(firstAttendee.timeZone).format(format);
  }

  function getInviteeEnd(format: string) {
    return dayjs(props.calEvent.endTime).tz(firstAttendee.timeZone).format(format);
  }

  const headTitle = firstAttendee.language.translate("confirmed_event_type_subject", {
    eventType: props.calEvent.type,
    name: props.calEvent.team?.name || props.calEvent.organizer.name,
    date: `${getInviteeStart("h:mma")} - ${getInviteeEnd("h:mma")}, ${firstAttendee.language.translate(
      getInviteeStart("dddd").toLowerCase()
    )}, ${firstAttendee.language.translate(getInviteeStart("MMMM").toLowerCase())} ${getInviteeStart(
      "D"
    )}, ${getInviteeStart("YYYY")}`,
  });

  return (
    <BaseEmailHtml
      headerType="checkCircle"
      headTitle={headTitle}
      title={firstAttendee.language.translate(
        props.recurringEvent?.count
          ? "your_event_has_been_scheduled_recurring"
          : "your_event_has_been_scheduled"
      )}
      subtitle={firstAttendee.language.translate("emailed_you_and_any_other_attendees")}>
      <Info label={firstAttendee.language.translate("what")} description={props.calEvent.type} />
      <WhenInfo calEvent={props.calEvent} recurringEvent={props.recurringEvent} />
      <WhoInfo calEvent={props.calEvent} />
      <LocationInfo calEvent={props.calEvent} />
      <Info
        label={props.calEvent.organizer.language.translate("description")}
        description={props.calEvent.description}
        withSpacer
      />
      <Info
        label={firstAttendee.language.translate("additional_notes")}
        description={props.calEvent.additionalNotes}
        withSpacer
      />
      <CustomInputs calEvent={props.calEvent} />
    </BaseEmailHtml>
  );
};

export default AttendeeScheduledEmail;
