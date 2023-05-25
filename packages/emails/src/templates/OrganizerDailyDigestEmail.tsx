import type { TFunction } from "next-i18next";

import dayjs from "@calcom/dayjs";
import { getUid } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { User } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { BaseEmailHtml, CallToAction, ManageLink, Separator } from "../components";
import Row from "../components/Row";

export const OrganizerDailyDigestEmail = (
  props: {
    user: User;
    calEvents: CalendarEvent[];
    t: TFunction;
  } & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const { user, calEvents, t } = props;
  const timeFormat = user.timeFormat === 24 ? TimeFormat.TWENTY_FOUR_HOUR : TimeFormat.TWELVE_HOUR;
  const locale = user.locale ?? "en";

  const formatDate = (date: string, format: string) =>
    dayjs(date).tz(user.timeZone).locale(locale).format(format);

  return (
    <BaseEmailHtml
      headerType="calendarCircle"
      subject={t("daily_digest_email_subject", { count: calEvents.length })}
      title={t("daily_digest_email_title")}
      subtitle={<>{t("daily_digest_email_subtitle")}</>}
      callToAction={<CallToAction label={t("manage_my_bookings")} href={`${WEBAPP_URL}/bookings`} />}>
      {calEvents.map((calEvent) => (
        <Row key={calEvent.uid}>
          <p style={{ textAlign: "center" }}>
            <a
              href={`${WEBAPP_URL}/booking/${getUid(calEvent)}`}
              style={{
                color: "#374151",
                textDecoration: "underline",
              }}>
              {calEvent.title}
            </a>
          </p>
          <p
            style={{
              textAlign: "center",
              color: "#101010",
              fontWeight: 400,
              lineHeight: "24px",
              whiteSpace: "pre-wrap",
            }}>
            {/* {recurringEvent?.count ? `${t("starting")} ` : ""} */}
            {formatDate(calEvent.startTime, `dddd, LL | ${timeFormat}`)} -{" "}
            {formatDate(calEvent.endTime, timeFormat)}{" "}
            <span style={{ color: "#4B5563" }}>({user.timeZone})</span>
          </p>
          <ManageLink attendee={calEvent.attendees[0]} calEvent={calEvent} />
          <Separator />
        </Row>
      ))}
    </BaseEmailHtml>
  );
};
