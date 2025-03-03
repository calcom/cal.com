import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { App } from "@calcom/types/App";

import http from "../../../lib/http";

export const QUERY_KEY = "use-delete-credential";
export type UseDeleteEventTypeProps = {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  onSettled?: () => void;
  teamId?: number;
  orgId?: number;
};
export const useDeleteCredential = ({
  onSuccess,
  onError,
  onSettled,
  teamId,
  orgId,
}: UseDeleteEventTypeProps) => {
  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: (app: App["slug"]) => {
      if (!app) throw new Error("app is required");

      let pathname = `/conferencing/${app}/disconnect`;

      if (teamId && orgId) {
        pathname = `/organizations/${orgId}/teams/${teamId}/conferencing/${app}/disconnect`;
      }
      return http?.delete(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
