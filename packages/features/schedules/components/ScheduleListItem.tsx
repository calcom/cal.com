import { Fragment } from "react";

import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuTrigger,
  ListItem,
} from "@calcom/ui";
import { FiGlobe, FiMoreHorizontal, FiTrash } from "@calcom/ui/components/icon";

export function ScheduleListItem({
  schedule,
  deleteFunction,
  displayOptions,
  updateDefault,
}: {
  schedule: RouterOutputs["viewer"]["availability"]["list"]["schedules"][number];
  deleteFunction: ({ scheduleId }: { scheduleId: number }) => void;
  displayOptions?: {
    timeZone?: string;
    hour12?: boolean;
  };
  updateDefault: ({ scheduleId, isDefault }: { scheduleId: number; isDefault: boolean }) => void;
}) {
  const { t, i18n } = useLocale();

  const { data, isLoading } = trpc.viewer.availability.schedule.get.useQuery({ scheduleId: schedule.id });

  return (
    <ListItem
      key={schedule.id}
      href={"/availability/" + schedule.id}
      heading={schedule.name}
      subHeading={
        <>
          <div className="mt-1 text-xs text-gray-500">
            {(schedule.timeZone || displayOptions?.timeZone) && (
              <p className="my-1 flex items-center first-letter:text-xs">
                <FiGlobe />
                &nbsp;{schedule.timeZone ?? displayOptions?.timeZone}
              </p>
            )}
            {schedule.availability
              .filter((availability) => !!availability.days.length)
              .map((availability) => (
                <p key={availability.id}>
                  {availabilityAsString(availability, {
                    locale: i18n.language,
                    hour12: displayOptions?.hour12,
                  })}
                  <br />
                </p>
              ))}
            {(schedule.timeZone || displayOptions?.timeZone) && (
              <p className="my-1 flex items-center first-letter:text-xs">
                <FiGlobe />
                &nbsp;{schedule.timeZone ?? displayOptions?.timeZone}
              </p>
            )}
          </div>
        </>
      }
      badgePosition="heading"
      badges={
        <>
          {schedule.isDefault && (
            <Badge variant="success" className="text-xs">
              {t("default")}
            </Badge>
          )}
        </>
      }
      actions={
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="icon" color="secondary" StartIcon={FiMoreHorizontal} />
          </DropdownMenuTrigger>
          {!isLoading && data && (
            <DropdownMenuContent>
              <DropdownMenuItem className="min-w-40 focus:ring-gray-100">
                {!schedule.isDefault && (
                  <DropdownItem
                    type="button"
                    onClick={() => {
                      updateDefault({
                        scheduleId: schedule.id,
                        isDefault: true,
                      });
                    }}>
                    {t("set_as_default")}
                  </DropdownItem>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem className="min-w-40 focus:ring-gray-100">
                <DropdownItem
                  type="button"
                  color="destructive"
                  StartIcon={FiTrash}
                  onClick={() => {
                    deleteFunction({
                      scheduleId: schedule.id,
                    });
                  }}>
                  {t("delete")}
                </DropdownItem>
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </Dropdown>
      }
    />
  );
}
