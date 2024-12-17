import { useMutation } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { App } from "@calcom/types/App";

import http from "../../../lib/http";

export const QUERY_KEY = "use-delete-credential";
export type UseDeleteEventTypeProps = {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  onSettled?: () => void;
};
export const useDeleteCredential = ({ onSuccess, onError, onSettled }: UseDeleteEventTypeProps) => {
  return useMutation({
    onSuccess,
    onError,
    onSettled,
    mutationFn: (app: App["slug"]) => {
      if (!app) throw new Error("app is required");
      const pathname = `/conferencing/${app}/disconnect`;
      return http?.delete(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return;
        }
        throw new Error(res.data.error.message);
      });
    },
  });
};
