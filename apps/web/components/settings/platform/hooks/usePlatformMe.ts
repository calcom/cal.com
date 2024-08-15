import { useQuery } from "@tanstack/react-query";

export const usePlatformMe = () => {
  const QUERY_KEY = "get-platform-me";
  const platformMeQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const response = await fetch(`/api/v2/me`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      });
      const data = await response.json();

      return data.data;
    },
  });

  return platformMeQuery;
};
