import Link from "next/link";
import { Fragment } from "react";

import { availabilityAsString } from "@calcom/lib/availability";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Availability } from "@calcom/prisma/client";
import { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Schedule } from "@calcom/types/schedule";
import {
  Badge,
  Button,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
} from "@calcom/ui";

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
    <li key={schedule.id}>
      <div className="flex items-center justify-between py-5 hover:bg-neutral-50 ltr:pl-4 rtl:pr-4 sm:ltr:pl-0 sm:rtl:pr-0">
        <div className="group flex w-full items-center justify-between hover:bg-neutral-50 sm:px-6">
          <Link
            href={"/availability/" + schedule.id}
            className="flex-grow truncate text-sm"
            title={schedule.name}>
            <div className="space-x-2 rtl:space-x-reverse">
              <span className="truncate font-medium text-neutral-900">{schedule.name}</span>
              {schedule.isDefault && (
                <Badge variant="success" className="text-xs">
                  {t("default")}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              {schedule.availability
                .filter((availability) => !!availability.days.length)
                .map((availability) => (
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
          </Link>
        </div>
        <Dropdown>
          <DropdownMenuTrigger asChild className="mx-5">
            <Button type="button" size="icon" color="secondary" StartIcon={Icon.FiMoreHorizontal} />
          </DropdownMenuTrigger>
          {!isLoading && data && (
            <DropdownMenuContent>
              <DropdownMenuItem className="min-w-40 focus:ring-gray-100">
                {!schedule.isDefault && (
                  <Button
                    type="button"
                    color="minimal"
                    className="w-full rounded-b-none border-none font-normal"
                    disabled={schedule.isDefault}
                    onClick={() => {
                      updateDefault({
                        scheduleId: schedule.id,
                        isDefault: true,
                      });
                    }}>
                    {t("set_as_default")}
                  </Button>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem className="min-w-40 focus:ring-gray-100">
                <Button
                  onClick={() => {
                    deleteFunction({
                      scheduleId: schedule.id,
                    });
                  }}
                  type="button"
                  color="destructive"
                  className={classNames(
                    "w-full border-none font-normal",
                    !schedule.isDefault && "rounded-t-none"
                  )}>
                  {t("delete")}
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </Dropdown>
      </div>
    </li>
  );
}
