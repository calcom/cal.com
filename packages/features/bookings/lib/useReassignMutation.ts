import { useRouter } from "next/router";

import { trpc } from "@calcom/trpc/react/trpc";
import { showToast } from "@calcom/ui";

const useReassignMutation = () => {
  const router = useRouter();

  const reassignMutation = trpc.viewer.bookings.reassign.useMutation({
    onSuccess: async () => {
      const query = {
        ...router.query,
      };
      delete query.dialog;
      router.push(
        {
          pathname: router.pathname,
          query,
        },
        undefined,
        { shallow: true }
      );
    },
    onError: () => {
      showToast(t("couldnt_update_timezone"), "error");
    },
  });

  return reassignMutation;
};

export default useReassignMutation;
