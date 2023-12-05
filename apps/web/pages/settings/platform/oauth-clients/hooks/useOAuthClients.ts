import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// hook to fetch oauth clients data
// react-query to fetch
// {loading, fetching, data} = useQuery to fetch data with react-query

export const useOAuthClient = () => {
  const { isLoading, error, data } = useQuery({
    queryKey: ["oauth-clients"],
    queryFn: () => {
      return axios
        .get(
          // The below url is only for testing for the time being
          // correct one would have a v2 endpoint
          `https://api.openweathermap.org/data/2.5/weather?q=London,uk&appid=d83d78f5987434a1d8eae1541a4cbf38`
        )
        .then((res) => res.data);
    },
  });

  return { isLoading, error, data };
};
