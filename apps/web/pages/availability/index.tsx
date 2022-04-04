import { ClockIcon } from "@heroicons/react/outline";
import { DotsHorizontalIcon, TrashIcon } from "@heroicons/react/solid";
import { Availability } from "@prisma/client";
import Link from "next/link";

import { availabilityAsString } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Button } from "@calcom/ui";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";

import { QueryCell } from "@lib/QueryCell";
import { HttpError } from "@lib/core/http/error";
import { inferQueryOutput, trpc } from "@lib/trpc";

import EmptyScreen from "@components/EmptyScreen";
import Shell from "@components/Shell";
import { NewScheduleButton } from "@components/availability/NewScheduleButton";

export function AvailabilityList({ schedules }: inferQueryOutput<"viewer.availability.list">) {
  const { t, i18n } = useLocale();
  const utils = trpc.useContext();
  const deleteMutation = trpc.useMutation("viewer.availability.schedule.delete", {
    onSuccess: async () => {
      await utils.invalidateQueries(["viewer.availability.list"]);
      showToast(t("schedule_deleted_successfully"), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });
  return (
    <>
      {schedules.length === 0 ? (
        <EmptyScreen
          Icon={ClockIcon}
          headline={t("new_schedule_heading")}
          description={t("new_schedule_description")}
        />
      ) : (
        <div className="-mx-4 mb-16 overflow-hidden rounded-sm border border-gray-200 bg-white sm:mx-0">
          <ul className="divide-y divide-neutral-200" data-testid="schedules">
            {schedules.map((schedule) => (
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
                            <>
                              {availabilityAsString(availability, i18n.language)}
                              <br />
                            </>
                          ))}
                        </p>
                      </a>
                    </Link>
                  </div>
                  <Dropdown>
                    <DropdownMenuTrigger className="group mr-5 h-10 w-10 border border-transparent p-0 text-neutral-500 hover:border-gray-200">
                      <DotsHorizontalIcon className="h-5 w-5 group-hover:text-gray-800" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Button
                          onClick={() =>
                            deleteMutation.mutate({
                              scheduleId: schedule.id,
                            })
                          }
                          type="button"
                          color="warn"
                          className="w-full font-normal"
                          StartIcon={TrashIcon}>
                          {t("delete_schedule")}
                        </Button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </Dropdown>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default function AvailabilityPage() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.availability.list"]);
  return (
    <div>
      <Shell heading={t("availability")} subtitle={t("configure_availability")} CTA={<NewScheduleButton />}>
        <QueryCell query={query} success={({ data }) => <AvailabilityList {...data} />} />
      </Shell>
    </div>
  );
}
