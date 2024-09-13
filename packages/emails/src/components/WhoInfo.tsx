import type { TFunction } from "next-i18next";

import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

const PersonInfo = ({ name = "", email = "", role = "", phoneNumber = "" }) => (
  <div style={{ color: "#101010", fontWeight: 400, lineHeight: "24px" }}>
    {name} - {role} {phoneNumber}
    {!isSmsCalEmail(email) && (
      <span style={{ color: "#4B5563" }}>
        <a href={`mailto:${email}`} style={{ color: "#4B5563" }}>
          {email}
        </a>
      </span>
    )}
  </div>
);

export function WhoInfo(props: { calEvent: CalendarEvent; t: TFunction }) {
  const { t } = props;
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
          {props.calEvent.team?.members.map((member) => (
            <PersonInfo key={member.name} name={member.name} role={t("team_member")} email={member?.email} />
          ))}
          {props.calEvent.attendees.map((attendee) => (
            <PersonInfo
              key={attendee.id || attendee.name}
              name={attendee.name}
              role={t("guest")}
              email={attendee.email}
              phoneNumber={attendee.phoneNumber ?? undefined}
            />
          ))}
        </>
      }
      withSpacer
    />
  );
}
