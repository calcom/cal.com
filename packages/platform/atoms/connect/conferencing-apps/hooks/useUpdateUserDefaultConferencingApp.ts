import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { App } from "@calcom/types/App";

import { useAtomsContext } from "../../../hooks/useAtomsContext";
import http from "../../../lib/http";

export const QUERY_KEY = "use-update-user-default-conferencing-app";
export type UseUpdateUserDefaultConferencingAppProps = {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  onSettled?: () => void;
  teamId?: number;
};
export const useUpdateUserDefaultConferencingApp = ({
  onSuccess,
  onError,
  onSettled,
  teamId,
}: UseUpdateUserDefaultConferencingAppProps) => {
  const { organizationId } = useAtomsContext();
  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: (app: App["slug"]) => {
      if (!app) throw new Error("app is required");

      let pathname = `/conferencing/${app}/default`;

      if (teamId) {
        pathname = `/organizations/${organizationId}/teams/${teamId}/conferencing/${app}/default`;
      }
      return http?.post(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
