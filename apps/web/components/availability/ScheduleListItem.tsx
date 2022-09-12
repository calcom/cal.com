/**
 * @deprecated modifications to this file should be v2 only
 * Use `/packages/features/schedules/components/ScheduleListItem.tsx` instead
 */
import Link from "next/link";
import { Fragment } from "react";

import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Availability } from "@calcom/prisma/client";
import { inferQueryOutput } from "@calcom/trpc/react";
import { Button } from "@calcom/ui";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";
import { Icon } from "@calcom/ui/Icon";

/**
 * @deprecated modifications to this file should be v2 only
 * Use `/packages/features/schedules/components/ScheduleListItem.tsx` instead
 */
export function ScheduleListItem({
  schedule,
  deleteFunction,
  isDeleting = false,
}: {
  schedule: inferQueryOutput<"viewer.availability.list">["schedules"][number];
  deleteFunction: ({ scheduleId }: { scheduleId: number }) => void;
  isDeleting: boolean;
}) {
  const { t, i18n } = useLocale();

  return (
    <li key={schedule.id}>
      <div className="flex items-center justify-between py-5 hover:bg-neutral-50 ltr:pl-4 rtl:pr-4 sm:ltr:pl-0 sm:rtl:pr-0">
        <div className="group flex w-full items-center justify-between hover:bg-neutral-50 sm:px-6">
          <Link href={"/availability/" + schedule.id}>
            <a className="flex-grow truncate text-sm" title={schedule.name}>
              <div>
                <span className="truncate font-medium text-neutral-900">{schedule.name}</span>
                {schedule.isDefault && (
                  <span className="ml-2 inline items-center rounded-sm bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
                    {t("default")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {schedule.availability.map((availability: Availability) => (
                  <Fragment key={availability.id}>
                    {availabilityAsString(availability, { locale: i18n.language })}
                    <br />
                  </Fragment>
                ))}
              </p>
            </a>
          </Link>
        </div>

        <Dropdown>
          <DropdownMenuTrigger className="group mr-5 h-10 w-10 border border-transparent p-0 text-neutral-500 hover:border-gray-200">
            <Icon.FiMoreHorizontal className="h-5 w-5 group-hover:text-gray-800" />
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
                color="warn"
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
