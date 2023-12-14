import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// hook to fetch oauth clients data
// react-query to fetch
// {loading, fetching, data} = useQuery to fetch data with react-query

export const useOAuthClients = () => {
  const { isLoading, error, data } = useQuery({
    queryKey: ["oauth-clients"],
    queryFn: () => {
      return axios
        .get(
          // The below url is only for testing for the time being
          // correct one would have a v2 endpoint
          "/api/v2/oauth-clients/"
        )
        .then((res) => res.data);
    },
  });

  return { isLoading, error, data };
};

export const useOAuthClient = (clientId: string) => {
  const { isLoading, error, data } = useQuery({
    queryKey: ["oauth-client"],
    queryFn: () => {
      return axios
        .get(
          // The below url is only for testing for the time being
          // correct one would have a v2 endpoint
          //  /api/v2/oauth-client/${clientId}
          `http://localhost/api/v2/oauth-client/${clientId}`
        )
        .then((res) => res.data);
    },
  });

  return { isLoading, error, data };
};
