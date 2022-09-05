import Link from "next/link";
import { Fragment } from "react";

import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Availability } from "@calcom/prisma/client";
import { inferQueryOutput } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import Badge from "@calcom/ui/v2/core/Badge";
import Button from "@calcom/ui/v2/core/Button";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/v2/core/Dropdown";

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
                <span className="truncate pr-2 font-semibold text-gray-900">{schedule.name}</span>
                {schedule.isDefault && <Badge variant="green">{t("default")}</Badge>}
              </div>
              <p className="mt-1 hidden text-base leading-4 text-gray-600 lg:block">
                {schedule.availability.map((availability: Availability) => (
                  <Fragment key={availability.id}>
                    {availabilityAsString(availability, i18n.language)}
                    <br />
                  </Fragment>
                ))}
              </p>
            </a>
          </Link>
        </div>
        <Button color="secondary" href={"/availability/" + schedule.id}>
          Edit
        </Button>
        <Dropdown>
          <DropdownMenuTrigger className="focus:bg-transparent focus:ring-0">
            <Button color="secondary" size="icon" StartIcon={Icon.FiMoreHorizontal} />
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
