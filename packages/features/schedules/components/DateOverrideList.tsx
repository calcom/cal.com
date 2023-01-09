import { UseFieldArrayRemove } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimeRange, WorkingHours } from "@calcom/types/schedule";
import { Button, DialogTrigger, Icon, Tooltip } from "@calcom/ui";

import DateOverrideInputDialog from "./DateOverrideInputDialog";

const DateOverrideList = ({
  items,
  remove,
  update,
  workingHours,
  excludedDates = [],
}: {
  remove: UseFieldArrayRemove;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: any;
  items: { ranges: TimeRange[]; id: string }[];
  workingHours: WorkingHours[];
  excludedDates?: string[];
}) => {
  const { t, i18n } = useLocale();
  if (!items.length) {
    return <></>;
  }

  const timeSpan = ({ start, end }: TimeRange) => {
    return (
      new Intl.DateTimeFormat(i18n.language, { hour: "numeric", minute: "numeric", hour12: true }).format(
        new Date(start.toISOString().slice(0, -1))
      ) +
      " - " +
      new Intl.DateTimeFormat(i18n.language, { hour: "numeric", minute: "numeric", hour12: true }).format(
        new Date(end.toISOString().slice(0, -1))
      )
    );
  };

  return (
    <ul className="rounded border border-gray-200" data-testid="date-overrides-list">
      {items.map((item, index) => (
        <li key={item.id} className="flex justify-between border-b px-5 py-4 last:border-b-0">
          <div>
            <h3 className="text-sm text-gray-900">
              {new Intl.DateTimeFormat("en-GB", {
                weekday: "short",
                month: "long",
                day: "numeric",
              }).format(item.ranges[0].start)}
            </h3>
            {item.ranges[0].end.getUTCHours() === 0 && item.ranges[0].end.getUTCMinutes() === 0 ? (
              <p className="text-xs text-neutral-500">{t("unavailable")}</p>
            ) : (
              item.ranges.map((range, i) => (
                <p key={i} className="text-xs text-neutral-500">
                  {timeSpan(range)}
                </p>
              ))
            )}
          </div>
          <div className="space-x-2 rtl:space-x-reverse">
            <DateOverrideInputDialog
              excludedDates={excludedDates}
              workingHours={workingHours}
              value={item.ranges}
              onChange={(ranges) => {
                update(index, {
                  ranges,
                });
              }}
              Trigger={
                <DialogTrigger asChild>
                  <Button
                    tooltip={t("edit")}
                    className="text-gray-700"
                    color="minimal"
                    size="icon"
                    StartIcon={Icon.FiEdit2}
                  />
                </DialogTrigger>
              }
            />
            <Tooltip content="Delete">
              <Button
                className="text-gray-700"
                color="destructive"
                size="icon"
                StartIcon={Icon.FiTrash2}
                onClick={() => remove(index)}
              />
            </Tooltip>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default DateOverrideList;
