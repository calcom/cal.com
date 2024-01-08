import { useQuery } from "@tanstack/react-query";
import useClientSchedule from "availability/hooks/useClientSchedule";

type ApiResponse = {
  defaultScheduleId: number;
};

const useDefaultClientSchedule = () => {
  const { data: user } = useQuery<ApiResponse>({
    queryKey: ["user"],
    queryFn: () => {
      return fetch(`/v2/me`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
  });

  const {
    data: defaultUserSchedule,
    isLoading,
    error,
  } = useClientSchedule(user.defaultScheduleId.toString(), "");

  return { isLoading, error, defaultUserSchedule };
};

export default useDefaultClientSchedule;
