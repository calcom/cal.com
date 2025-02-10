export const useDeleteOAuthClient = (
  { onSuccess, onError }: IPersistOAuthClient = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const mutation = useMutation<ApiResponse<PlatformOAuthClientDto>, unknown, DeleteOAuthClientInput>({
    mutationFn: async (data) => {
      const { id } = data;
      return fetch(`/api/v2/oauth-clients/${id}`, {
        method: "delete",
        headers: { "Content-type": "application/json" },
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
