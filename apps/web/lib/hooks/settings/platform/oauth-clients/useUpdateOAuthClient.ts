export const useUpdateOAuthClient = (
  { onSuccess, onError, clientId }: IPersistOAuthClient & { clientId?: string } = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const mutation = useMutation<
    ApiResponse<PlatformOAuthClientDto>,
    unknown,
    Omit<CreateOAuthClientInput, "permissions">
  >({
    mutationFn: async (data) => {
      return fetch(`/api/v2/oauth-clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res?.json());
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.();
      } else {
        onError?.();
      }
    },
    onError: () => {
      onError?.();
    },
  });

  return mutation;
};
