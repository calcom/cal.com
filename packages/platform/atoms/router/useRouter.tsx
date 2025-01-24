import { useQuery } from "@tanstack/react-query";

export const fetchDataOrRedirect = async (url: string) => {
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual", // Prevent automatic redirection
  });

  if (response.status >= 300 && response.status < 400) {
    const redirectUrl = response.headers.get("Location");
    if (redirectUrl) {
      return { redirect: redirectUrl };
    }
    throw new Error("Redirect expected but no Location header found");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }

  const data = await response.json();
  return { data };
};

export const QUERY_KEY = "get-router-url";
/**
 * Custom hook to fetch the current user's information.
 * Access Token must be provided to CalProvider in order to use this hook
 * @returns The result of the query containing the user's profile.
 */
export const useRouter = (url: string) => {
  const { data, isLoading, error, status } = useQuery({
    queryKey: [QUERY_KEY, url],
    queryFn: () => fetchDataOrRedirect(url),
    enabled: Boolean(url),
    staleTime: Infinity,
  });

  const isRedirect = data?.redirect;

  return { data, isRedirect, isLoading, error, status };
};
