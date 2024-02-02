import { showToast } from "@calcom/ui";

import { useAtomsContext } from "../../hooks/useAtomsContext";
import { useMe } from "../../hooks/useMe";
import useClientSchedule from "../hooks/useClientSchedule";
import useDeleteSchedule from "../hooks/useDeleteSchedule";
import { Availability } from "../index";

type PlatformAvailabilityWrapperProps = {
  id?: string;
};

export const PlatformAvailabilityWrapper = ({ id }: PlatformAvailabilityWrapperProps) => {
  const { isLoading, data: schedule } = useClientSchedule(key, id);
  const user = useMe();

  const { accessToken } = useAtomsContext();

  const displayOptions = {
    hour12: user.data?.timeFormat ? user.data.timeFormat === 12 : undefined,
    timeZone: user.data?.timeZone,
  };

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

  if (isLoading) return <>Loading...</>;

  return <Availability />;
};
