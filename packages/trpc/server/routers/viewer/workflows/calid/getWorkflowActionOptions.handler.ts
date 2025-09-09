import { getWorkflowActionOptions } from "@calid/features/modules/workflows/utils/getWorkflowOptions";

import { getTranslation } from "@calcom/lib/server/i18n";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type CalIdGetWorkflowActionOptionsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser> & {
      locale: string;
    };
  };
};

export const calIdGetWorkflowActionOptionsHandler = async ({ ctx }: CalIdGetWorkflowActionOptionsOptions) => {
  const { user } = ctx;

  const t = await getTranslation(ctx.user.locale, "common");

  // For CalId workflows, we don't use organization concept, so always pass false
  return getWorkflowActionOptions(t, false);
};
