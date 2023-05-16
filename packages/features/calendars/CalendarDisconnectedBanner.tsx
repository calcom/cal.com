import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { TopBanner } from "@calcom/ui";

export default function CalendarDisconnectedBanner() {
  const { t } = useLocale();
  const { data } = trpc.viewer.me.useQuery();
  const isPrimaryCalendarDisconnected = data && !data.destinationCalendar && data.primaryCalendar;

  return isPrimaryCalendarDisconnected ? (
    <TopBanner
      text={
        <>
          {t("disconnected_calendar", { calendarName: data.primaryCalendar })}{" "}
          <span className="underline">
            <Link href="/settings/my-account/calendars">{t("reconnect")}</Link>
          </span>
        </>
      }
      variant="error"
    />
  ) : null;
}
