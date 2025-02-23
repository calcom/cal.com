import { useQuery } from "@tanstack/react-query";

import type { PaymentPageProps } from "@calcom/features/ee/payments/pages/payment";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse } from "@calcom/platform-types";

import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";

export const QUERY_KEY = "use-event-app-integration";
export const useAtomsEventTypePaymentInfo = ({
  uid,
  onEventTypePaymentInfoSuccess,
  onEventTypePaymentInfoFailure,
}: {
  uid: string;
  onEventTypePaymentInfoSuccess?: () => void;
  onEventTypePaymentInfoFailure?: () => void;
}) => {
  const pathname = `/atoms/payment/${uid}`;
  const { isInit, accessToken } = useAtomsContext();

  return useQuery({
    queryKey: [QUERY_KEY, uid],
    queryFn: () => {
      return http?.get<ApiResponse<PaymentPageProps>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          onEventTypePaymentInfoSuccess?.();
          return res.data.data;
        }
        onEventTypePaymentInfoFailure?.();
        throw new Error(res.data.error.message);
      });
    },
    enabled: !!uid && isInit && !!accessToken,
  });
};
