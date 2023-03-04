import { useState } from "react";
import type { UseFieldArrayRemove } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { TimeRange, WorkingHours } from "@calcom/types/schedule";
import { Button, ButtonGroup, List, ListItem } from "@calcom/ui";
import { FiEdit2, FiTrash2 } from "@calcom/ui/components/icon";

import DateOverrideInputDialog from "./DateOverrideInputDialog";

const useSettings = () => {
  const { data } = useMeQuery();
  return {
    hour12: data?.timeFormat === 12,
    timeZone: data?.timeZone,
  };
};

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
  const [open, setOpen] = useState(false);
  const { t, i18n } = useLocale();
  const { hour12 } = useSettings();
  if (!items.length) {
    return <></>;
  }

  const timeSpan = ({ start, end }: TimeRange) => {
    return (
      new Intl.DateTimeFormat(i18n.language, { hour: "numeric", minute: "numeric", hour12 }).format(
        new Date(start.toISOString().slice(0, -1))
      ) +
      " - " +
      new Intl.DateTimeFormat(i18n.language, { hour: "numeric", minute: "numeric", hour12 }).format(
        new Date(end.toISOString().slice(0, -1))
      )
    );
  };

  return (
    <List data-testid="date-overrides-list">
      {items.map((item, index) => (
        <>
          <ListItem
            removeHover
            key={item.id}
            heading={new Intl.DateTimeFormat("en-GB", {
              weekday: "short",
              month: "long",
              day: "numeric",
            }).format(item.ranges[0].start)}
            subHeading={
              <>
                {item.ranges[0].end.getUTCHours() === 0 && item.ranges[0].end.getUTCMinutes() === 0 ? (
                  <p className="text-xs text-gray-500">{t("unavailable")}</p>
                ) : (
                  item.ranges.map((range, i) => (
                    <p key={i} className="text-xs text-gray-500">
                      {timeSpan(range)}
                    </p>
                  ))
                )}
              </>
            }
            actions={
              <>
                <ButtonGroup>
                  <Button
                    tooltip={t("edit")}
                    className="text-gray-700"
                    color="minimal"
                    onClick={() => setOpen(true)}
                    variant="icon"
                    StartIcon={FiEdit2}
                  />
                  <Button
                    className="text-gray-700"
                    color="destructive"
                    variant="icon"
                    StartIcon={FiTrash2}
                    onClick={() => remove(index)}
                  />
                </ButtonGroup>
              </>
            }
          />
          <DateOverrideInputDialog
            open={open}
            setOpen={setOpen}
            excludedDates={excludedDates}
            workingHours={workingHours}
            value={item.ranges}
            onChange={(ranges) => {
              update(index, {
                ranges,
              });
            }}
          />
        </>
      ))}
    </List>
  );
};

export default DateOverrideList;
