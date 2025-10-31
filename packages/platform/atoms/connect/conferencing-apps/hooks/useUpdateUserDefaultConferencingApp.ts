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
  orgId?: number;
};
export const useUpdateUserDefaultConferencingApp = ({
  onSuccess,
  onError,
  onSettled,
  teamId,
  orgId,
}: UseUpdateUserDefaultConferencingAppProps) => {
  const { organizationId } = useAtomsContext();
  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: ({ app, credentialId }: { app: App["slug"]; credentialId?: number }) => {
      if (!app) throw new Error("app is required");

      let pathname =
        credentialId !== undefined
          ? `/conferencing/${app}/default/${credentialId}`
          : `/conferencing/${app}/default`;

      if (teamId) {
        pathname =
          credentialId !== undefined
            ? `/organizations/${organizationId}/teams/${teamId}/conferencing/${app}/default/${credentialId}`
            : `/organizations/${organizationId}/teams/${teamId}/conferencing/${app}/default`;
      } else if (orgId) {
        pathname = `/organizations/${orgId}/conferencing/${app}/default`;
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
