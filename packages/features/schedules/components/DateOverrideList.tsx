import { noop } from "@tanstack/react-table";
import { formatInTimeZone } from "date-fns-tz";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { TimeRange, WorkingHours } from "@calcom/types/schedule";
import { Button } from "@calcom/ui/components/button";
import { DialogTrigger } from "@calcom/ui/components/dialog";
import { Tooltip } from "@calcom/ui/components/tooltip";

import DateOverrideInputDialog from "./DateOverrideInputDialog";

const sortByDate = (a: { ranges: TimeRange[]; id: string }, b: { ranges: TimeRange[]; id: string }) => {
  return a.ranges[0].start > b.ranges[0].start ? 1 : -1;
};

// I would like this to be decoupled, but RHF really doesn't support this.
const DateOverrideList = ({
  workingHours,
  excludedDates = [],
  travelSchedules = [],
  userTimeFormat,
  hour12,
  replace,
  fields,
  weekStart = 0,
  handleAvailabilityUpdate = noop,
  isDryRun = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replace: any;
  fields: { ranges: TimeRange[]; id: string }[];
  workingHours: WorkingHours[];
  excludedDates?: string[];
  userTimeFormat: number | null;
  hour12: boolean;
  travelSchedules?: RouterOutputs["viewer"]["travelSchedules"]["get"];
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  handleAvailabilityUpdate?: VoidFunction;
  isDryRun?: boolean;
}) => {
  const { t, i18n } = useLocale();
  const isPlatform = useIsPlatform();

  const unsortedFieldArrayMap = fields.reduce(
    (map: { [id: string]: number }, { id }, index) => ({ ...map, [id]: index }),
    {}
  );

  if (!fields.length) {
    return <></>;
  }

  const timeSpan = ({ start, end }: TimeRange) => {
    if (isPlatform) {
      return `${formatInTimeZone(start, "UTC", "h:mm a")} - ${formatInTimeZone(end, "UTC", "h:mm a")}`;
    }

    return `${new Intl.DateTimeFormat(i18n.language, { hour: "numeric", minute: "numeric", hour12 }).format(
      new Date(start.toISOString().slice(0, -1))
    )} - ${new Intl.DateTimeFormat(i18n.language, { hour: "numeric", minute: "numeric", hour12 }).format(
      new Date(end.toISOString().slice(0, -1))
    )}`;
  };

  return (
    <ul className="border-subtle rounded border" data-testid="date-overrides-list">
      {fields.sort(sortByDate).map((item) => (
        <li key={item.id} className="border-subtle flex justify-between border-b px-5 py-4 last:border-b-0">
          <div>
            <h3 className="text-emphasis text-sm">
              {!isPlatform &&
                new Intl.DateTimeFormat(i18n.language, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
                }).format(item.ranges[0].start)}
              {isPlatform && formatInTimeZone(new Date(item.ranges[0].start), "UTC", "EEE MMM dd")}
            </h3>
            {item.ranges[0].start.valueOf() - item.ranges[0].end.valueOf() === 0 ? (
              <p className="text-subtle text-xs">{t("unavailable")}</p>
            ) : (
              item.ranges.map((range, i) => (
                <p key={i} className="text-subtle text-xs">
                  {`${timeSpan(range)} ${
                    travelSchedules
                      .find(
                        (travelSchedule) =>
                          !dayjs(item.ranges[0].start).isBefore(travelSchedule.startDate) &&
                          (!dayjs(item.ranges[0].end).isAfter(travelSchedule.endDate) ||
                            !travelSchedule.endDate)
                      )
                      ?.timeZone.replace(/_/g, " ") || ""
                  }`}
                  <></>
                </p>
              ))
            )}
          </div>
          <div className="flex flex-row-reverse gap-5 space-x-2 rtl:space-x-reverse">
            <DateOverrideInputDialog
              userTimeFormat={userTimeFormat}
              excludedDates={excludedDates}
              workingHours={workingHours}
              value={item.ranges.map((range) => ({
                start: new Date(range.start),
                end: new Date(range.end),
              }))}
              weekStart={weekStart}
              onChange={(ranges) => {
                if (!isDryRun) {
                  // update has very weird side-effects with sorting.
                  replace([...fields.filter((currentItem) => currentItem.id !== item.id), { ranges }]);
                  delete unsortedFieldArrayMap[item.id];
                  handleAvailabilityUpdate();
                }
              }}
              Trigger={
                <DialogTrigger asChild>
                  <Button
                    tooltip={t("edit")}
                    className="text-default h-5"
                    color="minimal"
                    variant="icon"
                    StartIcon="pencil"
                  />
                </DialogTrigger>
              }
            />
            <Tooltip content="Delete">
              <Button
                className="text-default h-5"
                data-testid="delete-button"
                title={t("date_overrides_delete_on_date", {
                  date: isPlatform
                    ? formatInTimeZone(new Date(item.ranges[0].start), "UTC", "h:mm a")
                    : new Intl.DateTimeFormat(i18n.language, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        timeZone: "UTC",
                      }).format(item.ranges[0].start),
                })}
                color="destructive"
                variant="icon"
                StartIcon="trash-2"
                onClick={() => {
                  replace([...fields.filter((currentItem) => currentItem.id !== item.id)]);
                  if (!isDryRun) {
                    handleAvailabilityUpdate();
                  }
                }}
              />
            </Tooltip>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default DateOverrideList;
