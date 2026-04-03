import { ObservableAdminAction } from "@calcom/features/admin/actions/observable-admin-action";
import { getVerifyWorkflowsAction } from "@calcom/features/admin/di/container";
import logger from "@calcom/lib/logger";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminVerifyWorkflowsSchema } from "./verifyWorkflows.schema";

const log = logger.getSubLogger({ prefix: ["admin"] });

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminVerifyWorkflowsSchema;
};

const verifyWorkflowsHandler = async ({ ctx, input }: GetOptions) => {
  const action = new ObservableAdminAction(getVerifyWorkflowsAction(), {
    actionId: "verifyWorkflows",
    actor: { id: ctx.user.id, email: ctx.user.email },
    logger: log,
  });

  return action.execute(input);
};

export default verifyWorkflowsHandler;
