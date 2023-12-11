import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useClientSchedule = (clientId: string, key: string) => {
  const { isLoading, error, data } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => {
      return axios.get(`/v2/schedules/${clientId}?apiKey=${key}`).then((res) => res.data);
    },
  });

  return { isLoading, error, data };
};
