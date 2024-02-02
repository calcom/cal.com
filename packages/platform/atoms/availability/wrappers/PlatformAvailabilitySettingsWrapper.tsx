import { useState } from "react";
import { useForm } from "react-hook-form";

import { showToast } from "@calcom/ui";

import { useMe } from "../../hooks/useMe";
import useClientSchedule from "../hooks/useClientSchedule";
import useDeleteSchedule from "../hooks/useDeleteSchedule";
import { daysInAWeek } from "../lib/daysInAWeek";
import { AvailabilitySettings } from "../settings/index";
import type { AvailabilityFormValues } from "../types";

type PlatformAvailabilitySettingsWrapperProps = {
  id?: string;
};

export const PlatformAvailabilitySettingsWrapper = ({ id }: PlatformAvailabilitySettingsWrapperProps) => {
  const { isLoading, data: schedule } = useClientSchedule(key, id);
  const user = useMe();

  const userWeekStart = daysInAWeek.indexOf(user.data?.weekStart) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const { timeFormat } = user.data || { timeFormat: null };
  const [openSidebar, setOpenSidebar] = useState(false);

  const { mutateAsync, isLoading: isDeletionInProgress } = useDeleteSchedule({
    onSuccess: () => {
      showToast("Scheduled deleted successfully", "success");
    },
  });

  const handleDelete = async (id: string) => {
    if (schedule.id === user.defaultScheduleId) {
      showToast("You are required to have at least one schedule", "error");
    } else {
      await mutateAsync({ id, key });
    }
  };

  const handleDuplicate = async () => {
    // duplication function goes here
  };

  const form = useForm<AvailabilityFormValues>({
    values: schedule && {
      ...schedule,
      schedule: schedule?.availability || [],
    },
  });

  if (error === "no_key") return <>You havent entered a key</>;

  if (error === "invalid_key") return <>This is not a valid key, please enter a valid key</>;

  if (isLoading) return <>Loading...</>;
  return <AvailabilitySettings />;
};
