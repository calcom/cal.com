"use client";

import Link from "next/link";
import { Fragment, useState } from "react";

import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { sortAvailabilityStrings } from "@calcom/lib/weekstart";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

interface Schedule {
  id: number;
  name: string;
  isDefault: boolean;
  timeZone?: string | null;
  availability: {
    id: number;
    userId: number | null;
    eventTypeId: number | null;
    days: number[];
    startTime: Date;
    endTime: Date;
    date: Date | null;
    scheduleId: number | null;
  }[];
}

export function ScheduleListItem({
  schedule,
  deleteFunction,
  displayOptions,
  updateDefault,
  isDeletable,
  duplicateFunction,
  redirectUrl,
}: {
  schedule: Schedule;
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  type AvailabilityItem = (typeof schedule.availability)[number];

  return (
    <li key={schedule.id}>
      <div className="hover:bg-cal-muted flex items-center justify-between px-3 py-5 transition sm:px-4">
        <Link href={redirectUrl} className="grow truncate text-sm" title={schedule.name}>
          <div className="space-x-2 rtl:space-x-reverse">
            <span className="text-emphasis truncate font-medium">{schedule.name}</span>
            {schedule.isDefault && (
              <Badge variant="gray" className="text-xs">
                {t("default")}
              </Badge>
            )}
          </div>
          <p className="text-subtle mt-1">
            {schedule.availability
              .filter((availability: AvailabilityItem) => !!availability.days.length)
              .map((availability: AvailabilityItem) =>
                availabilityAsString(availability, {
                  locale: i18n.language,
                  hour12: displayOptions?.hour12,
                })
              )
              // sort the availability strings as per user's weekstart (settings)
              .sort(sortAvailabilityStrings(i18n.language, displayOptions?.weekStart))
              .map((availabilityString: string) => (
                <Fragment key={availabilityString}>
                  {availabilityString}
                  <br />
                </Fragment>
              ))}
            {(schedule.timeZone || displayOptions?.timeZone) && (
              <span className="my-1 flex items-center first-letter:text-xs">
                <Icon name="globe" className="h-3.5 w-3.5" />
                &nbsp;{schedule.timeZone ?? displayOptions?.timeZone}
              </span>
            )}
          </p>
        </Link>
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
                    setIsDeleteDialogOpen(true);
                  }
                }}>
                {t("delete")}
              </DropdownItem>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <ConfirmationDialogContent
            variety="danger"
            title={t("delete_schedule")}
            confirmBtnText={t("delete")}
            loadingText={t("delete")}
            onConfirm={(e) => {
              e.preventDefault();
              deleteFunction({
                scheduleId: schedule.id,
              });
            }}>
            {t("delete_schedule_description")}
          </ConfirmationDialogContent>
        </Dialog>
      </div>
    </li>
  );
}
