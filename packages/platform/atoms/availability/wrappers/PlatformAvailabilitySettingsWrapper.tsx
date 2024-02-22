import { useToast } from "@/components/ui/use-toast";

import type { ScheduleLabelsType } from "@calcom/features/schedules/components/Schedule";

import useClientSchedule from "../../hooks/useClientSchedule";
import useDeleteSchedule from "../../hooks/useDeleteSchedule";
import { useMe } from "../../hooks/useMe";
import useUpdateSchedule from "../../hooks/useUpdateSchedule";
import { AvailabilitySettings } from "../AvailabilitySettings";
import type { AvailabilityFormValues } from "../types";

type PlatformAvailabilitySettingsWrapperProps = {
  id?: string;
  labels?: {
    tooltips: ScheduleLabelsType;
  };
};

const defaultLabels = {
  tooltips: {
    addTime: "Add new time slot",
    copyTime: "Copy times to …",
    deleteTime: "Delete",
  },
} as const;

export const PlatformAvailabilitySettingsWrapper = ({
  id,
  labels = defaultLabels,
}: PlatformAvailabilitySettingsWrapperProps) => {
  const { isLoading, data: schedule } = useClientSchedule(id);
  const user = useMe();
  const userSchedule = schedule?.data.schedule;
  const { timeFormat } = user?.data.user || { timeFormat: null };
  const { toast } = useToast();

  const { mutateAsync, isPending: isDeletionInProgress } = useDeleteSchedule({
    onSuccess: () => {
      toast({
        description: "Schedule deleted successfully",
      });
    },
  });

  const { mutateAsync: updateSchedule, isPending: isSavingInProgress } = useUpdateSchedule({
    onSuccess: () => {
      toast({
        description: "Schedule updated successfully",
      });
    },
  });

  const handleDelete = async (id: number) => {
    await mutateAsync({ id });
  };

  const handleUpdate = async (id: number, body: AvailabilityFormValues) => {
    await updateSchedule({ id, ...body });
  };

  if (isLoading) return <div className="px-10 py-4 text-xl">Loading...</div>;

  if (userSchedule === null) return <div className="px-10 py-4 text-xl">No user schedule present</div>;

  return (
    <AvailabilitySettings
      labels={labels.tooltips}
      handleDelete={() => {
        userSchedule.id && handleDelete(userSchedule.id);
      }}
      handleSubmit={async (data) => {
        userSchedule.id && handleUpdate(userSchedule.id, data);
      }}
      weekStart="Sunday"
      timeFormat={timeFormat}
      isLoading={isLoading}
      schedule={
        schedule
          ? {
              name: userSchedule.name,
              id: userSchedule.id,
              isLastSchedule: userSchedule.isLastSchedule,
              isDefault: userSchedule.isDefault,
              workingHours: userSchedule.workingHours,
              dateOverrides: userSchedule.dateOverrides,
              timeZone: userSchedule.timeZone,
              availability: userSchedule.availability,
              schedule:
                userSchedule.schedule.reduce(
                  (acc, avail) => [
                    ...acc,
                    { ...avail, startTime: new Date(avail.startTime), endTime: new Date(avail.endTime) },
                  ],
                  []
                ) || [],
            }
          : undefined
      }
      isDeleting={isDeletionInProgress}
      isSaving={isSavingInProgress}
      backPath=""
      isPlatform={true}
    />
  );
};
