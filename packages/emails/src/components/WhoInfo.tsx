import type { TFunction } from "i18next";

import { formatPersonDisplay } from "@calcom/lib/bookings/hideOrganizerUtils";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

export const PersonInfo = ({ name = "", email = "", role = "", phoneNumber = "" }) => {
  const displayEmail = !isSmsCalEmail(email);
  const formattedPhoneNumber = phoneNumber ? `${phoneNumber} ` : "";

  return (
    <div style={{ color: "#101010", fontWeight: 400, lineHeight: "24px" }}>
      {name ? `${name} - ` : ""}
      {role} {formattedPhoneNumber}
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
  const { t, calEvent } = props;
  
  const organizerDisplay = formatPersonDisplay({
    name: calEvent.organizer.name,
    email: calEvent.organizer.email,
    role: t("organizer"),
    hideOrganizerName: calEvent.hideOrganizerName,
    hideOrganizerEmail: calEvent.hideOrganizerEmail,
  });
  
  return (
    <Info
      label={t("who")}
      description={
        <>
          <PersonInfo
            name={organizerDisplay.displayName}
            role={t("organizer")}
            email={organizerDisplay.displayEmail}
          />
          {calEvent.team?.members.map((member) => {
            const memberDisplay = formatPersonDisplay({
              name: member.name,
              email: member.email,
              role: t("team_member"),
              hideOrganizerName: calEvent.hideOrganizerName,
              hideOrganizerEmail: calEvent.hideOrganizerEmail,
            });
            
            return (
              <PersonInfo
                key={member.email}
                name={memberDisplay.displayName}
                role={t("team_member")}
                email={memberDisplay.displayEmail}
              />
            );
          })}
          {calEvent.attendees.map((attendee) => (
            <PersonInfo
              key={attendee.id || attendee.email}
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
