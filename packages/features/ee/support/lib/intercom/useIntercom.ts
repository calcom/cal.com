import noop from "lodash/noop";
import { useIntercom as useIntercomLib } from "react-use-intercom";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { CAL_URL } from "@calcom/lib/constants";
import { useHasTeamPlan, useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { trpc } from "@calcom/trpc/react";

// eslint-disable-next-line turbo/no-undeclared-env-vars
export const isInterComEnabled = z.string().min(1).safeParse(process.env.NEXT_PUBLIC_INTERCOM_APP_ID).success;

const useIntercomHook = isInterComEnabled
  ? useIntercomLib
  : () => {
      return {
        boot: noop,
        show: noop,
      };
    };

export const useIntercom = () => {
  const hookData = useIntercomHook();
  const { data } = trpc.viewer.me.useQuery();
  const { hasPaidPlan } = useHasPaidPlan();
  const { hasTeamPlan } = useHasTeamPlan();

  const open = () => {
    hookData.boot({
      name: data?.name ?? "",
      email: data?.email,
      userId: String(data?.id),
      createdAt: String(dayjs(data?.createdDate).unix()),
      customAttributes: {
        //keys should be snake cased
        user_name: data?.username,
        link: CAL_URL + "/" + data?.username,
        identity_provider: data?.identityProvider,
        timezone: data?.timeZone,
        locale: data?.locale,
        has_paid_plan: hasPaidPlan,
        has_team_plan: hasTeamPlan,
        metadata: data?.metadata,
      },
    });
    hookData.show();
  };
  return { ...hookData, open };
};

export default useIntercom;
