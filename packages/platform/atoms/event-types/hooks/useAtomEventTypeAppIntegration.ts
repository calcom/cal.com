import { useQuery } from "@tanstack/react-query";

import type { CredentialDataWithTeamName, LocationOption } from "@calcom/app-store/utils";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";
import type { App } from "@calcom/types/App";

import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";

type UserTeams =
  | []
  | {
      teamId: number;
      name: string;
      logoUrl: string | null;
      credentialId: number;
      isAdmin: boolean;
    }[];

type EnabledAppType = App & {
  credential: CredentialDataWithTeamName;
  credentials: CredentialDataWithTeamName[];
  userCredentialIds: number[];
  locationOption: LocationOption | null;
  teams: UserTeams;
};

export const QUERY_KEY = "use-event-app-integration";
export const useAtomsEventTypeById = (appSlug: string | null, teamId: number | null) => {
  const pathname = `/atoms/event-types-app/${appSlug}${teamId ? `?teamId=${teamId}` : ""}`;
  const { isInit, accessToken } = useAtomsContext();

  return useQuery({
    queryKey: [QUERY_KEY, appSlug],
    queryFn: () => {
      return http?.get<ApiResponse<{ app: EnabledAppType }>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data.data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: !!appSlug && isInit && !!accessToken,
  });
};
