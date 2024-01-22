import { showToast } from "@calcom/ui";

import { useApiKey } from "../../hooks/useApiKeys";
import useClientSchedule from "../hooks/useClientSchedule";
import useDeleteSchedule from "../hooks/useDeleteSchedule";
import { useProfileInfo } from "../hooks/useProfileInfo";
import { Availability } from "../index";

type PlatformAvailabilityWrapperProps = {
  id?: string;
};

export const PlatformAvailabilityWrapper = ({ id }: PlatformAvailabilityWrapperProps) => {
  const { key, error } = useApiKey();
  const { isLoading, data: schedule } = useClientSchedule(key, id);
  const user = useProfileInfo(key);

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

  if (error === "no_key") return <>You havent entered a key</>;

  if (error === "invalid_key") return <>This is not a valid key, please enter a valid key</>;

  if (isLoading) return <>Loading...</>;

  return <Availability />;
};
