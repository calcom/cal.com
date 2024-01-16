import { useQuery } from "@tanstack/react-query";

const useClientSchedule = (key: string, clientId?: string) => {
  const { isLoading, error, data } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => {
      return fetch(
        clientId ? `/v2/schedules/${clientId}?apiKey=${key}` : `/v2/schedules/defaultSchedule?apiKey=${key}`,
        {
          method: "get",
          headers: { "Content-type": "application/json" },
        }
      ).then((res) => res.json());
    },
  });

  return { isLoading, error, data };
};

export default useClientSchedule;
