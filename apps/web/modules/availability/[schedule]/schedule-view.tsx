"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AvailabilitySettings } from "@calcom/atoms/availability/AvailabilitySettings";
import type { BulkUpdatParams } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import { withErrorFromUnknown } from "@calcom/lib/getClientErrorFromUnknown";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import type { ScheduleRepository } from "@calcom/lib/server/repository/schedule";
import type { TravelScheduleRepository } from "@calcom/lib/server/repository/travelSchedule";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { SkeletonText, SkeletonContainer, SkeletonButton } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

type PageProps = {
  scheduleFetched?: Awaited<ReturnType<typeof ScheduleRepository.findDetailedScheduleById>>;
  travelSchedules?: Awaited<ReturnType<typeof TravelScheduleRepository.findTravelSchedulesByUserId>>;
};

const AvailabilitySettingsSkeleton = () => {
  const { t } = useLocale();

  return (
    <SkeletonContainer>
      <div className="mb-4">
        <SkeletonText className="h-8 w-48" />
        <div className="mt-2">
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="mt-1 h-4 w-40" />
        </div>
      </div>

      <div className="mb-4 flex justify-end gap-2">
        <SkeletonButton className="h-9 w-20 rounded-md" />
        <SkeletonButton className="h-9 w-20 rounded-md" />
      </div>

      <div className="flex flex-col sm:mx-0 xl:flex-row xl:space-x-6">
        <div className="flex-1 flex-row xl:mr-0">
          <div className="border-subtle mb-6 rounded-md border p-6">
            {/* Schedule skeleton */}
            {Array(7)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="mb-4 flex">
                  <SkeletonText className="mr-4 h-6 w-28" />
                  <SkeletonText className="h-6 w-full" />
                </div>
              ))}
          </div>
        </div>
        <div className="min-w-40 col-span-3 hidden space-y-2 md:block lg:col-span-1">
          <div className="w-full pr-4 sm:ml-0 sm:p-0">
            <SkeletonText className="mb-2 h-4 w-24" />
            <SkeletonText className="h-10 w-64 rounded-md" />
          </div>
        </div>
      </div>
    </SkeletonContainer>
  );
};

export const AvailabilitySettingsWebWrapper = ({
  scheduleFetched: scheduleProp,
  travelSchedules: travelSchedulesProp,
}: PageProps) => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const me = useMeQuery();
  const scheduleId = searchParams?.get("schedule") ? Number(searchParams.get("schedule")) : -1;
  const fromEventType = searchParams?.get("fromEventType");
  const { timeFormat } = me.data || { timeFormat: null };
  const { data: scheduleData, isPending: isFetchingPending } = trpc.viewer.availability.schedule.get.useQuery(
    { scheduleId },
    {
      enabled: !!scheduleId && !scheduleProp,
    }
  );
  const isPending = isFetchingPending && !scheduleProp;
  const schedule = scheduleProp ?? scheduleData;

  const { data: travelSchedulesData } = trpc.viewer.travelSchedules.get.useQuery(undefined, {
    enabled: !travelSchedulesProp,
  });
  const travelSchedules = travelSchedulesProp ?? travelSchedulesData;

  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const bulkUpdateDefaultAvailabilityMutation =
    trpc.viewer.availability.schedule.bulkUpdateToDefaultAvailability.useMutation();

  const { data: eventTypesQueryData, isFetching: isEventTypesFetching } =
    trpc.viewer.eventTypes.bulkEventFetch.useQuery();

  const bulkUpdateFunction = ({ eventTypeIds, callback }: BulkUpdatParams) => {
    bulkUpdateDefaultAvailabilityMutation.mutate(
      {
        eventTypeIds,
        selectedDefaultScheduleId: scheduleData?.id,
      },
      {
        onSuccess: () => {
          utils.viewer.availability.list.invalidate();
          callback();
          showToast(t("success"), "success");
        },
      }
    );
  };

  const handleBulkEditDialogToggle = () => {
    utils.viewer.apps.getUsersDefaultConferencingApp.invalidate();
  };

  const isDefaultSchedule = me.data?.defaultScheduleId === scheduleId;

  const updateMutation = trpc.viewer.availability.schedule.update.useMutation({
    onSuccess: async ({ prevDefaultId, currentDefaultId, ...data }) => {
      if (prevDefaultId && currentDefaultId) {
        // check weather the default schedule has been changed by comparing  previous default schedule id and current default schedule id.
        if (prevDefaultId !== currentDefaultId) {
          // if not equal, invalidate previous default schedule id and refetch previous default schedule id.
          utils.viewer.availability.schedule.get.invalidate({ scheduleId: prevDefaultId });
          utils.viewer.availability.schedule.get.refetch({ scheduleId: prevDefaultId });
        }
      }
      utils.viewer.availability.schedule.get.invalidate({ scheduleId: data.schedule.id });
      utils.viewer.availability.list.invalidate();
      showToast(
        t("availability_updated_successfully", {
          scheduleName: data.schedule.name,
        }),
        "success"
      );
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const deleteMutation = trpc.viewer.availability.schedule.delete.useMutation({
    onError: withErrorFromUnknown((err) => {
      showToast(err.message, "error");
    }),
    onSettled: () => {
      utils.viewer.availability.list.invalidate();
    },
    onSuccess: () => {
      showToast(t("schedule_deleted_successfully"), "success");
      router.push("/availability");
    },
  });

  if (isPending) return <AvailabilitySettingsSkeleton />;

  // We wait for the schedule to be loaded before rendering the form inside AvailabilitySettings
  // since `defaultValues` cannot be redeclared after first render and using `values` will
  // trigger a form reset when revalidating. Introducing flaky behavior.
  if (!schedule) return null;

  return (
    <AvailabilitySettings
      schedule={schedule}
      travelSchedules={isDefaultSchedule ? travelSchedules || [] : []}
      isDeleting={deleteMutation.isPending}
      isLoading={isPending}
      isSaving={updateMutation.isPending}
      enableOverrides={true}
      timeFormat={timeFormat}
      weekStart={me.data?.weekStart || "Sunday"}
      backPath={fromEventType ? true : "/availability"}
      handleDelete={() => {
        scheduleId && deleteMutation.mutate({ scheduleId });
      }}
      handleSubmit={async ({ dateOverrides, ...values }) => {
        scheduleId &&
          updateMutation.mutate({
            scheduleId,
            dateOverrides: dateOverrides.flatMap((override) => override.ranges),
            ...values,
          });
      }}
      bulkUpdateModalProps={{
        isOpen: isBulkUpdateModalOpen,
        setIsOpen: setIsBulkUpdateModalOpen,
        save: bulkUpdateFunction,
        isSaving: bulkUpdateDefaultAvailabilityMutation.isPending,
        eventTypes: eventTypesQueryData?.eventTypes,
        isEventTypesFetching,
        handleBulkEditDialogToggle: handleBulkEditDialogToggle,
      }}
    />
  );
};
