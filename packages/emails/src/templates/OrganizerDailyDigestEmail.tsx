import type { TFunction } from "next-i18next";

import type { User } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { BaseEmailHtml, Info } from "../components";

export const OrganizerDailyDigestEmail = (
  props: {
    user: User;
    calEvents: CalendarEvent[];
    t: TFunction;
  } & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  return (
    <BaseEmailHtml
      subject={props.t("daily_digest_email_subject", { count: props.calEvents.length })}
      title={props.t("daily_digest_email_title")}
      subtitle={<>{props.t("daily_digest_email_subtitle")}</>}>
      <Info label="User" description={props.user.name} withSpacer />
    </BaseEmailHtml>
  );
};
