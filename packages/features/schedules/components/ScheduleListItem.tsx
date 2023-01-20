import Link from "next/link";
import { Fragment } from "react";

import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
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
              <span className="truncate font-medium text-gray-900">{schedule.name}</span>
              {schedule.isDefault && (
                <Badge variant="success" className="text-xs">
                  {t("default")}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
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
            <Button type="button" variant="icon" color="secondary" StartIcon={Icon.FiMoreHorizontal} />
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
                  StartIcon={Icon.FiTrash}
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
      </div>
    </li>
  );
}
