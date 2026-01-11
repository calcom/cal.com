"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { revalidateAvailabilityList } from "app/(use-page-wrapper)/(main-nav)/availability/actions";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import posthog from "posthog-js";

import { BulkEditDefaultForEventsModal } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import type { BulkUpdatParams } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import { NewScheduleButton } from "@calcom/features/schedules/components/NewScheduleButton";
import { ScheduleListItem } from "@calcom/features/schedules/components/ScheduleListItem";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { ToggleGroup } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type AvailabilityListProps = {
  availabilities: RouterOutputs["viewer"]["availability"]["list"];
};
export function AvailabilityList({ availabilities }: AvailabilityListProps) {
  const { t } = useLocale();
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false);
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data: user } = useMeQuery();

  const deleteMutation = trpc.viewer.availability.schedule.delete.useMutation({
    onMutate: async ({ scheduleId }) => {
      await utils.viewer.availability.list.cancel();
      const previousValue = utils.viewer.availability.list.getData();
      if (previousValue) {
        const filteredValue = previousValue.schedules.filter(({ id }) => id !== scheduleId);
        utils.viewer.availability.list.setData(undefined, { ...previousValue, schedules: filteredValue });
      }

      return { previousValue };
    },

    onError: (err, variables, context) => {
      if (context?.previousValue) {
        utils.viewer.availability.list.setData(undefined, context.previousValue);
      }
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
    onSettled: () => {
      utils.viewer.availability.list.invalidate();
    },
    onSuccess: () => {
      revalidateAvailabilityList();
      showToast(t("schedule_deleted_successfully"), "success");
    },
  });

  const updateMutation = trpc.viewer.availability.schedule.update.useMutation({
    onSuccess: async ({ schedule }) => {
      await utils.viewer.availability.list.invalidate();
      revalidateAvailabilityList();
      showToast(
        t("availability_updated_successfully", {
          scheduleName: schedule.name,
        }),
        "success"
      );
      setBulkUpdateModal(true);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const bulkUpdateDefaultAvailabilityMutation =
    trpc.viewer.availability.schedule.bulkUpdateToDefaultAvailability.useMutation();

  const { data: eventTypesQueryData, isFetching: isEventTypesFetching } =
    trpc.viewer.eventTypes.bulkEventFetch.useQuery();

  const bulkUpdateFunction = ({ eventTypeIds, callback }: BulkUpdatParams) => {
    bulkUpdateDefaultAvailabilityMutation.mutate(
      {
        eventTypeIds,
      },
      {
        onSuccess: () => {
          utils.viewer.availability.list.invalidate();
          revalidateAvailabilityList();
          showToast(t("success"), "success");
          callback();
        },
      }
    );
  };

  const handleBulkEditDialogToggle = () => {
    utils.viewer.apps.getUsersDefaultConferencingApp.invalidate();
  };

  const duplicateMutation = trpc.viewer.availability.schedule.duplicate.useMutation({
    onSuccess: async ({ schedule }) => {
      await router.push(`/availability/${schedule.id}`);
      showToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  // Adds smooth delete button - item fades and old item slides into place

  const [animationParentRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      {availabilities.schedules.length === 0 ? (
        <div className="flex justify-center">
          <EmptyScreen
            Icon="clock"
            headline={t("new_schedule_heading")}
            description={t("new_schedule_description")}
            className="w-full"
            buttonRaw={<NewScheduleButton />}
          />
        </div>
      ) : (
        <>
          <div className="border-subtle bg-default overflow-hidden rounded-md border">
            <ul className="divide-subtle divide-y" data-testid="schedules" ref={animationParentRef}>
              {availabilities.schedules.map((schedule) => (
                <ScheduleListItem
                  redirectUrl={`/availability/${schedule.id}`}
                  displayOptions={{
                    hour12: user?.timeFormat ? user.timeFormat === 12 : undefined,
                    timeZone: user?.timeZone,
                    weekStart: user?.weekStart || "Sunday",
                  }}
                  key={schedule.id}
                  schedule={schedule}
                  isDeletable={availabilities.schedules.length !== 1}
                  updateDefault={updateMutation.mutate}
                  deleteFunction={deleteMutation.mutate}
                  duplicateFunction={duplicateMutation.mutate}
                />
              ))}
            </ul>
          </div>
          <div className="text-default mb-16 mt-4 block text-center text-sm">
            {t("temporarily_out_of_office")}{" "}
            <Link href="settings/my-account/out-of-office" className="underline">
              {t("add_a_redirect")}
            </Link>
          </div>
          {bulkUpdateModal && (
            <BulkEditDefaultForEventsModal
              isPending={bulkUpdateDefaultAvailabilityMutation.isPending}
              open={bulkUpdateModal}
              setOpen={setBulkUpdateModal}
              bulkUpdateFunction={bulkUpdateFunction}
              description={t("default_schedules_bulk_description")}
              eventTypes={eventTypesQueryData?.eventTypes}
              isEventTypesFetching={isEventTypesFetching}
              handleBulkEditDialogToggle={handleBulkEditDialogToggle}
            />
          )}
        </>
      )}
    </>
  );
}

type AvailabilityCTAProps = {
  canViewTeamAvailability: boolean;
};
export const AvailabilityCTA = ({ canViewTeamAvailability }: AvailabilityCTAProps) => {
  const searchParams = useCompatSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();

  const toggleGroupOptions = [
    { value: "mine", label: t("my_availability") },
    ...(canViewTeamAvailability ? [{ value: "team", label: t("team_availability"), onClick: () => { posthog.capture("team_availability_toggle_clicked") } }] : []),
  ]

  // Get a new searchParams string by merging the current
  // searchParams with a provided key/value pair
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams ?? undefined);
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  return (
    <div className="flex items-center gap-2">
      <ToggleGroup
        className="hidden h-fit md:block"
        defaultValue={searchParams?.get("type") ?? "mine"}
        onValueChange={(value) => {
          if (!value) return;
          router.push(`${pathname}?${createQueryString("type", value)}`);
        }}
        options={toggleGroupOptions}
      />
      <NewScheduleButton />
    </div>
  );
};
