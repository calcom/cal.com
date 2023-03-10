import dayjs from "@calcom/dayjs";
import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { SkeletonText } from "@calcom/ui";

import useRouterQuery from "@lib/hooks/useRouterQuery";

type User = RouterOutputs["viewer"]["me"];

export interface IBusySlot {
  start: string | Date;
  end: string | Date;
  title?: string;
  source?: string | null;
}

const AvailabilityView = ({ user }: { user: User }) => {
  const { t } = useLocale();
  const { date, setQuery: setSelectedDate } = useRouterQuery("date");
  const selectedDate = dayjs(date);
  const formattedSelectedDate = selectedDate.format("YYYY-MM-DD");

  const { data, isLoading } = trpc.viewer.availability.user.useQuery(
    {
      username: user.username!,
      dateFrom: selectedDate.startOf("day").utc().format(),
      dateTo: selectedDate.endOf("day").utc().format(),
      withSource: true,
    },
    {
      enabled: !!user.username,
    }
  );

  const overrides =
    data?.dateOverrides.reduce((acc, override) => {
      if (
        formattedSelectedDate !== dayjs(override.start).format("YYYY-MM-DD") &&
        formattedSelectedDate !== dayjs(override.end).format("YYYY-MM-DD")
      )
        return acc;
      acc.push({ ...override, source: "Date override" });
      return acc;
    }, [] as IBusySlot[]) || [];

  return (
    <div className="bg-default max-w-xl overflow-hidden rounded-md shadow">
      <div className="px-4 py-5 sm:p-6">
        {t("overview_of_day")}{" "}
        <input
          type="date"
          className="inline h-8 border-none p-0"
          defaultValue={formattedSelectedDate}
          onChange={(e) => {
            if (e.target.value) setSelectedDate(e.target.value);
          }}
        />
        <small className="text-muted block">{t("hover_over_bold_times_tip")}</small>
        <div className="mt-4 space-y-4">
          <div className="bg-brand dark:bg-darkmodebrand overflow-hidden rounded-md">
            <div className="text-brandcontrast dark:text-darkmodebrandcontrast px-4 py-2 sm:px-6">
              {t("your_day_starts_at")} {convertMinsToHrsMins(user.startTime)}
            </div>
          </div>
          {(() => {
            if (isLoading)
              return (
                <>
                  <SkeletonText className="block h-16 w-full" />
                  <SkeletonText className="block h-16 w-full" />
                </>
              );

            if (data && (data.busy.length > 0 || overrides.length > 0))
              return [...data.busy, ...overrides]
                .sort((a: IBusySlot, b: IBusySlot) => (a.start > b.start ? -1 : 1))
                .map((slot: IBusySlot) => (
                  <div
                    key={dayjs(slot.start).format("HH:mm")}
                    className="bg-subtle overflow-hidden rounded-md"
                    data-testid="troubleshooter-busy-time">
                    <div className="text-emphasis px-4 py-5 sm:p-6">
                      {t("calendar_shows_busy_between")}{" "}
                      <span className="text-default font-medium" title={dayjs(slot.start).format("HH:mm")}>
                        {dayjs(slot.start).format("HH:mm")}
                      </span>{" "}
                      {t("and")}{" "}
                      <span className="text-default font-medium" title={dayjs(slot.end).format("HH:mm")}>
                        {dayjs(slot.end).format("HH:mm")}
                      </span>{" "}
                      {t("on")} {dayjs(slot.start).format("D")}{" "}
                      {t(dayjs(slot.start).format("MMMM").toLowerCase())} {dayjs(slot.start).format("YYYY")}
                      {slot.title && ` - (${slot.title})`}
                      {slot.source && <small>{` - (source: ${slot.source})`}</small>}
                    </div>
                  </div>
                ));
            return (
              <div className="bg-subtle overflow-hidden rounded-md">
                <div className="text-emphasis px-4 py-5 sm:p-6">{t("calendar_no_busy_slots")}</div>
              </div>
            );
          })()}

          <div className="bg-brand dark:bg-darkmodebrand overflow-hidden rounded-md">
            <div className="text-brandcontrast dark:text-darkmodebrandcontrast px-4 py-2 sm:px-6">
              {t("your_day_ends_at")} {convertMinsToHrsMins(user.endTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Troubleshoot() {
  const { data, isLoading } = trpc.viewer.me.useQuery();
  const { t } = useLocale();
  return (
    <div>
      <Shell heading={t("troubleshoot")} subtitle={t("troubleshoot_description")}>
        {!isLoading && data && <AvailabilityView user={data} />}
      </Shell>
    </div>
  );
}

function convertMinsToHrsMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hs = h < 10 ? "0" + h : h;
  const ms = m < 10 ? "0" + m : m;
  return `${hs}:${ms}`;
}
