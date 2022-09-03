import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import EmptyScreen from "@calcom/ui/EmptyScreen";
import { Icon } from "@calcom/ui/Icon";
import Shell from "@calcom/ui/Shell";

import { withQuery } from "@lib/QueryCell";
import { HttpError } from "@lib/core/http/error";

import { NewScheduleButton } from "@components/availability/NewScheduleButton";
import { ScheduleListItem } from "@components/availability/ScheduleListItem";
import SkeletonLoader from "@components/availability/SkeletonLoader";

export function AvailabilityList({ schedules }: inferQueryOutput<"viewer.availability.list">) {
  const { t } = useLocale();
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
          Icon={Icon.FiClock}
          headline={t("new_schedule_heading")}
          description={t("new_schedule_description")}
        />
      ) : (
        <div className="-mx-4 mb-16 overflow-hidden rounded-sm border border-gray-200 bg-white sm:mx-0">
          <ul className="divide-y divide-neutral-200" data-testid="schedules">
            {schedules.map((schedule) => (
              <ScheduleListItem
                key={schedule.id}
                schedule={schedule}
                deleteFunction={deleteMutation.mutate}
                isDeleting={deleteMutation.isLoading}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

const WithQuery = withQuery(["viewer.availability.list"]);

export default function AvailabilityPage() {
  const { t } = useLocale();
  return (
    <div>
      <Shell heading={t("availability")} subtitle={t("configure_availability")} CTA={<NewScheduleButton />}>
        <WithQuery success={({ data }) => <AvailabilityList {...data} />} customLoader={<SkeletonLoader />} />
      </Shell>
    </div>
  );
}
