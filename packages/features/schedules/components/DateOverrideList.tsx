import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { TimeRange } from "@calcom/types/schedule";
import { Button, Tooltip } from "@calcom/ui";
import { FiEdit2, FiTrash2 } from "@calcom/ui/components/icon";

import type { DateOverrideDialogProps } from "./DateOverrideDialog";
import DateOverrideDialog from "./DateOverrideDialog";

const sortByDate = (a: { ranges: TimeRange[] }, b: { ranges: TimeRange[] }) => {
  return a.ranges[0].start > b.ranges[0].start ? 1 : -1;
};

const useSettings = () => {
  const { data } = useMeQuery();
  return {
    hour12: data?.timeFormat === 12,
    timeZone: data?.timeZone,
  };
};

const TimeRangeFormatted = ({ start, end }: TimeRange) => {
  const { hour12 } = useSettings();
  const { i18n } = useLocale();
  return (
    <>
      {new Intl.DateTimeFormat(i18n.language, { hour: "numeric", minute: "numeric", hour12 }).format(
        new Date(start.toISOString().slice(0, -1))
      ) +
        " - " +
        new Intl.DateTimeFormat(i18n.language, { hour: "numeric", minute: "numeric", hour12 }).format(
          new Date(end.toISOString().slice(0, -1))
        )}
    </>
  );
};

const DateOverrideListItem = ({
  actions,
  ...item
}: {
  id: string;
  ranges: TimeRange[];
  actions: React.ReactNode;
}) => {
  const { t } = useLocale();
  return (
    <li key={item.id} className="flex justify-between border-b px-5 py-4 last:border-b-0">
      <div>
        <h3 className="text-sm text-gray-900">
          {new Intl.DateTimeFormat("en-GB", {
            weekday: "short",
            month: "long",
            day: "numeric",
          }).format(item.ranges[0].start)}
        </h3>
        {item.ranges[0].start.valueOf() - item.ranges[0].end.valueOf() === 0 ? (
          <p className="text-xs text-gray-500">{t("unavailable")}</p>
        ) : (
          item.ranges.map((range, i) => (
            <p key={i} className="text-xs text-gray-500">
              <TimeRangeFormatted start={range.start} end={range.end} />
            </p>
          ))
        )}
      </div>
      {actions}
    </li>
  );
};

const DateOverrideList = ({
  items,
  onDelete,
  updateDialogProps,
}: {
  items: { id: string; ranges: TimeRange[] }[];
  onDelete: (index: string) => void;
  updateDialogProps: Omit<DateOverrideDialogProps, "Trigger">;
}) => {
  const { t } = useLocale();
  // no display needed
  if (!items.length) {
    return null;
  }

  return (
    <ul className="rounded border border-gray-200" data-testid="date-overrides-list">
      {items.sort(sortByDate).map((item) => {
        return (
          <DateOverrideListItem
            key={item.id}
            {...item}
            actions={
              <div className="flex flex-row-reverse gap-5 space-x-2 rtl:space-x-reverse">
                <DateOverrideDialog
                  {...updateDialogProps}
                  index={item.id}
                  value={item.ranges}
                  Trigger={
                    <Button
                      tooltip={t("edit")}
                      className="text-gray-700"
                      color="minimal"
                      variant="icon"
                      StartIcon={FiEdit2}
                    />
                  }
                />
                <Tooltip content="Delete">
                  <Button
                    className="text-gray-700"
                    color="destructive"
                    variant="icon"
                    StartIcon={FiTrash2}
                    onClick={() => {
                      onDelete(item.id);
                    }}
                  />
                </Tooltip>
              </div>
            }
          />
        );
      })}
    </ul>
  );
};

export default DateOverrideList;
