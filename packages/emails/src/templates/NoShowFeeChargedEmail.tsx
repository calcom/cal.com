import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

export const NoShowFeeChargedEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const t = props.attendee.language.translate;
  return (
    <BaseScheduledEmail
      title={t("no_show_fee_charged_text_body")}
      headerType="calendarCircle"
      subject={<></>}
      {...props}
      t={t}
    />
  );
};
