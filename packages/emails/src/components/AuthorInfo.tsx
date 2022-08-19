import { TFunction } from "next-i18next";

import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

interface PersonProps {
  name?: string | null;
  email?: string | null;
}

const PersonInfo = ({ name, email }: PersonProps) => (
  <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
    {name} -{" "}
    <span style={{ color: "#888888" }}>
      <a href={`mailto:${email}`} style={{ color: "#888888" }}>
        {email}
      </a>
    </span>
  </div>
);

export function AuthorInfo(props: { calEvent: CalendarEvent; t: TFunction }) {
  const { t, calEvent } = props;
  const label = calEvent?.authorCancellation ? t("cancelled_by") : t("rescheduled_by");
  const name = calEvent?.authorCancellation ? calEvent?.authorCancellation : calEvent.authorReschedule;
  const email = calEvent?.authorCancellationEmail
    ? calEvent.authorCancellationEmail
    : calEvent.authorRescheduleEmail;

  return (
    <>
      {(!!name || !!email) && (
        <Info label={label} description={<PersonInfo name={name} email={email} />} withSpacer />
      )}
    </>
  );
}
