import { useQuery } from "@tanstack/react-query";

export const useCheckTeamBilling = (teamId?: number | null, isPlatformTeam?: boolean | null) => {
  const QUERY_KEY = "check-team-billing";
  const isTeamBilledAlready = useQuery({
    queryKey: [QUERY_KEY, teamId],
    queryFn: async () => {
      const response = await fetch(`/api/v2/billing/${teamId}/check`, {
        method: "get",
        headers: { "Content-type": "application/json" },
      });
      const data = await response.json();

      return data.data;
    },
    enabled: !!teamId && !!isPlatformTeam,
    staleTime: 5000,
  });

  return isTeamBilledAlready;
};
