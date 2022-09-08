import Link from "next/link";
import { Fragment } from "react";

import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Availability } from "@calcom/prisma/client";
import { inferQueryOutput } from "@calcom/trpc/react";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";
import { Icon } from "@calcom/ui/Icon";
import Badge from "@calcom/ui/v2/core/Badge";
import Button from "@calcom/ui/v2/core/Button";

export function ScheduleListItem({
  schedule,
  deleteFunction,
  isDeleting = false,
  displayOptions,
}: {
  schedule: inferQueryOutput<"viewer.availability.list">["schedules"][number];
  deleteFunction: ({ scheduleId }: { scheduleId: number }) => void;
  isDeleting: boolean;
  displayOptions?: {
    timeZone?: string;
    hour12?: boolean;
  };
}) {
  const { t, i18n } = useLocale();

  return (
    <li key={schedule.id}>
      <div className="flex items-center justify-between py-5 hover:bg-neutral-50 ltr:pl-4 rtl:pr-4 sm:ltr:pl-0 sm:rtl:pr-0">
        <div className="group flex w-full items-center justify-between hover:bg-neutral-50 sm:px-6">
          <Link href={"/availability/" + schedule.id}>
            <a className="flex-grow truncate text-sm" title={schedule.name}>
              <div className="space-x-2">
                <span className="truncate font-medium text-neutral-900">{schedule.name}</span>
                {schedule.isDefault && (
                  <Badge variant="success" className="text-xs">
                    {t("default")}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {schedule.availability.map((availability: Availability) => (
                  <Fragment key={availability.id}>
                    {availabilityAsString(availability, {
                      locale: i18n.language,
                      hour12: displayOptions?.hour12,
                    })}
                    <br />
                  </Fragment>
                ))}
                {schedule.timeZone && schedule.timeZone !== displayOptions?.timeZone && (
                  <p className="my-1 flex items-center first-letter:text-xs">
                    <Icon.FiGlobe />
                    &nbsp;{schedule.timeZone}
                  </p>
                )}
              </p>
            </a>
          </Link>
        </div>
        <Dropdown>
          <DropdownMenuTrigger asChild className="mr-5">
            <Button type="button" size="icon" color="minimalSecondary" StartIcon={Icon.FiMoreHorizontal} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Button
                disabled={isDeleting}
                onClick={() => {
                  deleteFunction({
                    scheduleId: schedule.id,
                  });
                }}
                type="button"
                color="destructive"
                className="w-full font-normal"
                StartIcon={isDeleting ? undefined : Icon.FiTrash}
                loading={isDeleting}>
                {isDeleting ? t("deleting") : t("delete_schedule")}
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </li>
  );
}
