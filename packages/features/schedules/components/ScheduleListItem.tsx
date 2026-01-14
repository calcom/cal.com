"use client";

import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { triggerToast } from "@calid/features/ui/components/toast";
import Link from "next/link";
import { Fragment } from "react";

import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { sortAvailabilityStrings } from "@calcom/lib/weekstart";
import type { RouterOutputs } from "@calcom/trpc/react";

export function ScheduleListItem({
  schedule,
  deleteFunction,
  displayOptions,
  updateDefault,
  isDeletable,
  duplicateFunction,
}: {
  schedule: RouterOutputs["viewer"]["availability"]["list"]["schedules"][number];
  deleteFunction: ({ scheduleId }: { scheduleId: number }) => void;
  displayOptions?: {
    timeZone?: string;
    hour12?: boolean;
    weekStart?: string;
  };
  isDeletable: boolean;
  updateDefault: ({ scheduleId, isDefault }: { scheduleId: number; isDefault: boolean }) => void;
  duplicateFunction: ({ scheduleId }: { scheduleId: number }) => void;
}) {
  const { t, i18n } = useLocale();

  return (
    <div key={schedule.id}>
      <div className="flex items-center justify-between px-3 py-5 transition-shadow hover:shadow-md sm:px-4">
        <div className="group flex w-full items-center justify-between">
          <Link
            href={`/availability/${schedule.id}`}
            className="flex-grow truncate text-sm"
            title={schedule.name}>
            <div className="space-x-2 rtl:space-x-reverse">
              <span className="text-emphasis truncate font-medium">{schedule.name}</span>
              {schedule.isDefault && (
                <Badge variant="success" className="text-xs">
                  {t("default")}
                </Badge>
              )}
            </div>
            <p className="text-subtle mt-1">
              {schedule.availability
                .filter((availability) => !!availability.days.length)
                .map((availability) =>
                  availabilityAsString(availability, {
                    locale: i18n.language,
                    hour12: displayOptions?.hour12,
                  })
                )
                .sort(sortAvailabilityStrings(i18n.language, displayOptions?.weekStart))
                .map((availabilityString, index) => (
                  <Fragment key={index}>
                    {availabilityString}
                    <br />
                  </Fragment>
                ))}
              {(schedule.timeZone || displayOptions?.timeZone) && (
                <p className="my-1 flex items-center text-xs">
                  <Icon name="globe" className="h-3.5 w-3.5" />
                  &nbsp;{schedule.timeZone ?? displayOptions?.timeZone}
                </p>
              )}
            </p>
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              data-testid="schedule-more"
              StartIcon="ellipsis"
              variant="icon"
              color="minimal"
              type="button"
              className="hover:bg-muted rounded-md transition-colors"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-40" align="end">
            {!schedule.isDefault && (
              <DropdownMenuItem
                onClick={() =>
                  updateDefault({
                    scheduleId: schedule.id,
                    isDefault: true,
                  })
                }>
                <Icon name="star" className="mr-2 h-4 w-4" />
                {t("set_as_default")}
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={() =>
                duplicateFunction({
                  scheduleId: schedule.id,
                })
              }
              data-testid={`schedule-duplicate${schedule.id}`}>
              <Icon name="copy" className="mr-2 h-4 w-4" />
              {t("duplicate")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!isDeletable) {
                  triggerToast(t("requires_at_least_one_schedule"), "error");
                } else {
                  deleteFunction({ scheduleId: schedule.id });
                }
              }}
              className="text-destructive">
              <Icon name="trash" className="mr-2 h-4 w-4" />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
