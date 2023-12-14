import { useMutation } from "@tanstack/react-query";

import type { ApiSuccessResponse, CreateOAuthClientInput } from "@calcom/platform-types";

interface IUsePersistOAuthClient {
  onSuccess?: () => void;
  onError?: () => void;
}
// hook to update, save and delete oauth clients data
export const usePersistOAuthClient = (
  { onSuccess, onError }: IUsePersistOAuthClient = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const mutation = useMutation<
    ApiSuccessResponse<{ client_id: string; client_secret: string }>,
    unknown,
    CreateOAuthClientInput
  >({
    mutationFn: (data) => {
      console.log(data);
      return fetch("/api/v2/oauth-clients", {
        method: "post",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json());
    },
    onSuccess: (data, variables, context) => {
      // I will fire first
      console.log("succes", data);
      onSuccess?.();
    },
    onError: (error, variables, context) => {
      // I will fire first
      console.error("error", error);
      onError?.();
    },
    onSettled: (data, error, variables, context) => {
      // I will fire first
    },
  });
  return mutation;
};
