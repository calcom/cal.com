import { showToast } from "@calcom/ui";

import { useMe } from "../../hooks/useMe";
import useClientSchedule from "../hooks/useClientSchedule";
import useDeleteSchedule from "../hooks/useDeleteSchedule";

// import { Availability } from "../index";

type PlatformAvailabilityWrapperProps = {
  id?: string;
};

export const PlatformAvailabilityWrapper = ({ id }: PlatformAvailabilityWrapperProps) => {
  const { isLoading, data: schedule } = useClientSchedule(id);
  const user = useMe();

  const displayOptions = {
    hour12: user?.data.user.timeFormat ? user.data.user.timeFormat === 12 : undefined,
    timeZone: user?.data.user.timeZone,
  };

  const { mutateAsync, isPending: isDeletionInProgress } = useDeleteSchedule({
    onSuccess: () => {
      showToast("Scheduled deleted successfully", "success");
    },
  });

  const handleDelete = async (id: string) => {
    if (schedule.id === user.defaultScheduleId) {
      showToast("You are required to have at least one schedule", "error");
    } else {
      await mutateAsync({ id });
    }
  };

  const handleDuplicate = async () => {
    // duplication function goes here
  };

  if (isLoading) return <>Loading...</>;

  // return <Availability />;
  return <>This is the Availability card</>;
};
