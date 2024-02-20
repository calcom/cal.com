import { useState } from "react";
import { useForm } from "react-hook-form";

import type { ScheduleLabelsType } from "@calcom/features/schedules/components/Schedule";
import { showToast } from "@calcom/ui";

import { useMe } from "../../hooks/useMe";
import useClientSchedule from "../hooks/useClientSchedule";
import useDeleteSchedule from "../hooks/useDeleteSchedule";
import useUpdateSchedule from "../hooks/useUpdateSchedule";
import { daysInAWeek } from "../lib/daysInAWeek";
import { PlatformAvailabilitySettings } from "../settings/index";
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

  const userWeekStart = daysInAWeek.indexOf(user?.data.user.weekStart) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const { timeFormat } = user?.data.user || { timeFormat: null };
  const [openSidebar, setOpenSidebar] = useState(false);

  const { mutateAsync, isPending: isDeletionInProgress } = useDeleteSchedule({
    onSuccess: () => {
      showToast("Scheduled deleted successfully", "success");
    },
  });

  const { mutateAsync: mutateAsyncUpdation, isPending: isSavingInProgress } = useUpdateSchedule({
    onSuccess: () => {
      showToast("Scheduled updated successfully", "success");
    },
  });

  const handleDelete = async (id: number) => {
    if (schedule.id === user.defaultScheduleId) {
      showToast("You are required to have at least one schedule", "error");
    } else {
      await mutateAsync({ id });
    }
  };

  const handleUpdation = async (id: number, body: AvailabilityFormValues) => {
    await mutateAsyncUpdation({ id, body });
  };

  const form = useForm<AvailabilityFormValues>({
    values: schedule && {
      ...schedule,
      schedule: schedule?.availability || [],
    },
  });

  if (isLoading) return <div className="px-10 py-4 text-xl">Loading...</div>;

  return (
    <PlatformAvailabilitySettings
      labels={labels.tooltips}
      onScheduleDeletion={async () => {
        userSchedule.id && handleDelete(userSchedule.id);
      }}
      onScheduleUpdation={handleUpdation}
      weekStart="Sunday"
      timeFormat={timeFormat}
      isHeadingReady={!isLoading}
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
              availability: userSchedule.availability || [],
              schedule: userSchedule.schedule || [],
            }
          : undefined
      }
    />
  );
};
