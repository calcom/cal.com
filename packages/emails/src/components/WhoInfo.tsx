import type { TFunction } from "i18next";

import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

export const PersonInfo = ({ name = "", email = "", role = "", phoneNumber = "" }) => {
  const displayEmail = !isSmsCalEmail(email);
  const formattedPhoneNumber = !!phoneNumber ? `${phoneNumber} ` : "";

  return (
    <div style={{ color: "#101010", fontWeight: 400, lineHeight: "24px" }}>
      {name} - {role} {formattedPhoneNumber}
      {displayEmail && (
        <span style={{ color: "#4B5563" }}>
          <a href={`mailto:${email}`} style={{ color: "#4B5563" }}>
            {email}
          </a>
        </span>
      )}
    </div>
  );
};

export function WhoInfo(props: { calEvent: CalendarEvent; t: TFunction }) {
  const { t } = props;

  const teamMemberEmails = new Set(props.calEvent.team?.members.map((m) => m.email));
  const shouldHideTeamEmails =
    props.calEvent.hideOrganizerEmail &&
    (props.calEvent.schedulingType === "COLLECTIVE" || props.calEvent.schedulingType === "ROUND_ROBIN");

  return (
    <Info
      label={t("who")}
      description={
        <>
          <PersonInfo
            name={props.calEvent.organizer.name}
            role={t("organizer")}
            email={props.calEvent.hideOrganizerEmail ? "" : props.calEvent.organizer.email}
          />
          {props.calEvent.team?.members.map((member) => (
            <PersonInfo
              key={member.name}
              name={member.name}
              role={t("team_member")}
              email={shouldHideTeamEmails ? "" : member?.email}
            />
          ))}
          {props.calEvent.attendees
            .filter((attendee) => !shouldHideTeamEmails || !teamMemberEmails.has(attendee.email))
            .map((attendee) => (
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
