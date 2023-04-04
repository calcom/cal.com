import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

export const NoShowFeeChargedEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { calEvent } = props;
  const t = props.attendee.language.translate;

  if (!calEvent.paymentInfo?.amount) throw new Error("No payment info");

  return (
    <BaseScheduledEmail
      title={t("no_show_fee_charged_text_body")}
      headerType="calendarCircle"
      subtitle={
        <>
          {t("no_show_fee_charged_subtitle", {
            amount: calEvent.paymentInfo.amount / 100,
            formatParams: { amount: { currency: calEvent.paymentInfo?.currency } },
          })}
        </>
      }
      timeZone={props.attendee.timeZone}
      {...props}
      t={t}
    />
  );
};
