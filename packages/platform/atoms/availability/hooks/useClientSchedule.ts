import { useQuery } from "@tanstack/react-query";

const useClientSchedule = (key: string, id?: string) => {
  const { isLoading, error, data } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => {
      return fetch(id ? `/v2/schedules/${id}?apiKey=${key}` : `/v2/schedules/default?apiKey=${key}`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
  });

  return { isLoading, error, data };
};

export default useClientSchedule;
