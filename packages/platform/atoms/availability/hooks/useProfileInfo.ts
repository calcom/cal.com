import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useProfileInfo = (key: string) => {
  const { data } = useQuery({
    queryKey: ["user"],
    queryFn: () => {
      return axios.get(`/v2/me?apiKey=${key}`).then((res) => res.data);
    },
  });

  return { data };
};
