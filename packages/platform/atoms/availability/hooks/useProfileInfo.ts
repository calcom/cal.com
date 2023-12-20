import { useQuery } from "@tanstack/react-query";

export const useProfileInfo = (key: string) => {
  const { data } = useQuery({
    queryKey: ["user"],
    queryFn: () => {
      return fetch(`/v2/me?apiKey=${key}`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      }).then((res) => res.json());
    },
  });

  return { data };
};
