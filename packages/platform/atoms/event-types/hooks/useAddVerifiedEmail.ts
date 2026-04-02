import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiErrorResponse, ApiResponse } from "@calcom/platform-types";
import { useMutation } from "@tanstack/react-query";
import { useAtomsContext } from "../../hooks/useAtomsContext";
import { appendClientIdToEmail } from "../../lib/appendClientIdToEmail";
import http from "../../lib/http";

interface IUseAddVerifiedEmail {
  onSuccess?: (res: ApiResponse) => void;
  onError?: (err: ApiErrorResponse | Error) => void;
}

export const useAddVerifiedEmail = (
  { onSuccess, onError }: IUseAddVerifiedEmail = {
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  }
) => {
  const { clientId } = useAtomsContext();

  const verifiedEmailEntry = useMutation<
    ApiResponse<{
      status: string;
      data: {
        emailVerified: boolean;
      };
    }>,
    unknown,
    {
      email: string;
    }
  >({
    mutationFn: (data) => {
      const { email } = data;
      const emailToSend = appendClientIdToEmail(email, clientId);

      return http
        .post(`/atoms/emails/verified-emails`, {
          email: emailToSend,
        })
        .then((res) => {
          return res.data;
        });
    },
    onSuccess: (data) => {
      if (data.status === SUCCESS_STATUS) {
        onSuccess?.(data);
      } else {
        onError?.(data);
      }
    },
    onError: (err) => {
      onError?.(err as ApiErrorResponse);
    },
  });

  return verifiedEmailEntry;
};
