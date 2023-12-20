import { useQuery } from "@tanstack/react-query";

export const useClientSchedule = (clientId: string, key: string) => {
  const { isLoading, error, data } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => {
      return fetch(`/v2/schedules/${clientId}?apiKey=${key}`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
  });

  return { isLoading, error, data };
};
