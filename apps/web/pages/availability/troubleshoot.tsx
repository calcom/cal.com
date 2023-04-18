import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import Shell from "@calcom/features/shell/Shell";
import { yyyymmdd } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
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
  const { date, setQuery: setSelectedDate } = useRouterQuery("date");
  const selectedDate = dayjs(date);
  const formattedSelectedDate = selectedDate.format("YYYY-MM-DD");

  const { data } = trpc.viewer.availability.user.useQuery(
    {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    <div className="max-w-xl overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="px-4">
        <Calendar
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          events={[...(data?.busy || []), ...overrides]
            .sort((a: IBusySlot, b: IBusySlot) => (a.start > b.start ? -1 : 1))
            .map((slot) => ({
              // TODO: Modify the Calendar view to be better at displaying blocks.
              id: undefined,
              title:
                (slot.title ? `(${slot.title}) - ` : "") + (slot.source ? `(source: ${slot.source})` : ""),
              start: new Date(slot.start),
              end: new Date(slot.end),
            }))}
          onDateChange={(e) => setSelectedDate(yyyymmdd(e))}
          startDate={selectedDate.startOf("day").toDate()}
          endDate={selectedDate.endOf("day").toDate()}
          view="day"
        />
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
