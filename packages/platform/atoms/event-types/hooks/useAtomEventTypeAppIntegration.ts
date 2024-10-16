import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { App, CredentialDataWithTeamName, LocationOption } from "@calcom/platform-libraries-1.2.3";
import type { ApiResponse } from "@calcom/platform-types";

import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";

type EnabledAppType = App & {
  credential: CredentialDataWithTeamName;
  credentials: CredentialDataWithTeamName[];
  userCredentialIds: number[];
  locationOption: LocationOption | null;
};

export const QUERY_KEY = "use-event-app-integration";
export const useAtomsEventTypeById = (appSlug: string | null) => {
  const pathname = `/atoms/event-types-app/${appSlug}`;
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
