"use client";

import Link from "next/link";
import { Fragment } from "react";

import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { sortAvailabilityStrings } from "@calcom/lib/weekstart";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { showToast } from "@calcom/ui/components/toast";

export function ScheduleListItem({
  schedule,
  deleteFunction,
  displayOptions,
  updateDefault,
  isDeletable,
  duplicateFunction,
  redirectUrl,
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
  redirectUrl: string;
}) {
  const { t, i18n } = useLocale();

  const isSynced = !!schedule.syncSource;
  const hasSyncError = !!schedule.syncError;

  return (
    <li key={schedule.id}>
      <div className="hover:bg-cal-muted flex items-center justify-between px-3 py-5 transition sm:px-4">
        <div className="group flex w-full items-center justify-between ">
          <Link href={redirectUrl} className="grow truncate text-sm" title={schedule.name}>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-emphasis truncate font-medium">{schedule.name}</span>
              {schedule.isDefault && (
                <Badge variant="gray" className="text-xs">
                  {t("default")}
                </Badge>
              )}
              {isSynced && (
                <Tooltip
                  content={
                    hasSyncError
                      ? t("sync_error_tooltip", { error: schedule.syncError })
                      : schedule.syncLastAt
                        ? t("synced_from_google_working_location", {
                            date: new Date(schedule.syncLastAt).toLocaleDateString(),
                          })
                        : t("synced_from_google_working_location_no_date")
                  }>
                  <Badge variant={hasSyncError ? "red" : "blue"} className="flex items-center gap-1 text-xs">
                    <Icon name="refresh-cw" className="h-3 w-3" />
                    {hasSyncError ? t("sync_error") : t("synced")}
                  </Badge>
                </Tooltip>
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
                // sort the availability strings as per user's weekstart (settings)
                .sort(sortAvailabilityStrings(i18n.language, displayOptions?.weekStart))
                .map((availabilityString, index) => (
                  <Fragment key={index}>
                    {availabilityString}
                    <br />
                  </Fragment>
                ))}
              {isSynced && schedule.availability.filter((a) => !!a.days.length).length === 0 && (
                <span className="text-subtle italic">{t("availability_from_working_location")}</span>
              )}
              {(schedule.timeZone || displayOptions?.timeZone) && (
                <span className="my-1 flex items-center first-letter:text-xs">
                  <Icon name="globe" className="h-3.5 w-3.5" />
                  &nbsp;{schedule.timeZone ?? displayOptions?.timeZone}
                </span>
              )}
            </p>
          </Link>
        </div>
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button
              data-testid="schedule-more"
              type="button"
              variant="icon"
              color="secondary"
              StartIcon="ellipsis"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {!schedule.isDefault && (
              <DropdownMenuItem className="min-w-40 focus:ring-muted">
                <DropdownItem
                  type="button"
                  StartIcon="star"
                  onClick={() => {
                    updateDefault({
                      scheduleId: schedule.id,
                      isDefault: true,
                    });
                  }}>
                  {t("set_as_default")}
                </DropdownItem>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="outline-none">
              <DropdownItem
                type="button"
                data-testid={`schedule-duplicate${schedule.id}`}
                StartIcon="copy"
                onClick={() => {
                  duplicateFunction({
                    scheduleId: schedule.id,
                  });
                }}>
                {t("duplicate")}
              </DropdownItem>
            </DropdownMenuItem>
            <DropdownMenuItem className="min-w-40 focus:ring-muted">
              <DropdownItem
                type="button"
                color="destructive"
                StartIcon="trash"
                data-testid="delete-schedule"
                className="rounded-t-none"
                onClick={() => {
                  if (!isDeletable) {
                    showToast(t("requires_at_least_one_schedule"), "error");
                  } else {
                    deleteFunction({
                      scheduleId: schedule.id,
                    });
                  }
                }}>
                {t("delete")}
              </DropdownItem>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </li>
  );
}
