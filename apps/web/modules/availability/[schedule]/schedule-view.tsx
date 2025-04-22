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
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center">
            <SkeletonText className="h-8 w-32" /> {/* Title */}
            <SkeletonText className="ml-2 h-4 w-4 rounded-md" /> {/* Pencil icon */}
          </div>
          <div className="ml-2">
            <SkeletonText className="h-4 w-64" /> {/* Schedule description */}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonText className="h-4 w-24" /> {/* Set to Default text */}
          <div className="h-6 w-12 rounded-full bg-gray-200" /> {/* Toggle */}
          <div className="mx-2 h-4 w-px bg-gray-200" />
          <SkeletonButton className="h-9 w-20 rounded-md" /> {/* Save button */}
        </div>
      </div>

      <div className="flex flex-col sm:mx-0 xl:flex-row xl:space-x-6">
        <div className="flex-1 flex-row xl:mr-0">
          <div className="border-subtle mb-8 rounded-md border p-6">
            {/* Schedule skeleton */}
            {Array(7)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="mb-4 flex items-center">
                  <div className="mr-4 flex w-28 items-center">
                    <div className="mr-3 h-5 w-10 rounded-full bg-gray-200" /> {/* Toggle */}
                    <SkeletonText className="h-5 w-16" /> {/* Day name */}
                  </div>
                  <div className="flex flex-1 items-center">
                    <SkeletonText className="h-9 w-24 rounded-md" /> {/* Time input */}
                    <div className="mx-2">
                      <SkeletonText className="h-5 w-2" /> {/* Dash */}
                    </div>
                    <SkeletonText className="h-9 w-24 rounded-md" /> {/* Time input */}
                    <div className="ml-4 flex gap-2">
                      <SkeletonText className="h-9 w-9 rounded-md" /> {/* Add button */}
                      <SkeletonText className="h-9 w-9 rounded-md" /> {/* Duplicate button */}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Date overrides section */}
          <div className="mb-8">
            <div className="mb-2 flex items-center">
              <SkeletonText className="h-5 w-32" /> {/* Date overrides */}
              <SkeletonText className="ml-2 h-5 w-5 rounded-full" /> {/* Info icon */}
            </div>
            <SkeletonText className="h-4 w-full max-w-md" /> {/* Description */}
            <div className="mt-4">
              <SkeletonButton className="h-9 w-36 rounded-md" /> {/* Add an override button */}
            </div>
          </div>
        </div>

        <div className="min-w-40 space-y-6 md:block">
          <div className="w-full">
            <SkeletonText className="mb-2 h-4 w-24" /> {/* Timezone */}
            <SkeletonText className="h-10 w-64 rounded-md" /> {/* Timezone selector */}
          </div>

          <div className="mt-6 w-full">
            <SkeletonText className="mb-2 h-4 w-64" /> {/* Something doesn't look right? */}
            <SkeletonButton className="h-9 w-48 rounded-md" /> {/* Launch troubleshooter */}
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
