import autoAnimate from "@formkit/auto-animate";
import { useRef, useEffect } from "react";

import { NewScheduleButton, ScheduleListItem } from "@calcom/features/schedules";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import Shell from "@calcom/ui/Shell";
import { EmptyScreen, showToast } from "@calcom/ui/v2";

import { withQuery } from "@lib/QueryCell";
import { HttpError } from "@lib/core/http/error";

import SkeletonLoader from "@components/availability/SkeletonLoader";

export function AvailabilityList({ schedules }: inferQueryOutput<"viewer.availability.list">) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const animationParentRef = useRef(null);

  const meQuery = trpc.useQuery(["viewer.me"]);

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

  // Adds smooth delete button - item fades and old item slides into place
  useEffect(() => {
    animationParentRef.current && autoAnimate(animationParentRef.current);
  }, [animationParentRef]);

  return (
    <>
      {schedules.length === 0 ? (
        <div className="flex justify-center">
          <EmptyScreen
            Icon={Icon.FiClock}
            headline={t("new_schedule_heading")}
            description={t("new_schedule_description")}
            buttonRaw={<NewScheduleButton />}
          />
        </div>
      ) : (
        <div className="mb-16 overflow-hidden rounded-md border border-gray-200 bg-white">
          <ul className="divide-y divide-neutral-200" data-testid="schedules" ref={animationParentRef}>
            {schedules.map((schedule) => (
              <ScheduleListItem
                displayOptions={{
                  hour12: meQuery.data?.timeFormat ? meQuery.data.timeFormat === 12 : undefined,
                  timeZone: meQuery.data?.timeZone,
                }}
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
