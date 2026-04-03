import { ObservableAdminAction } from "@calcom/features/admin/actions/observable-admin-action";
import { getWhitelistUserWorkflowsAction } from "@calcom/features/admin/di/container";
import logger from "@calcom/lib/logger";

import type { TrpcSessionUser } from "../../../types";
import type { TWhitelistUserWorkflows } from "./whitelistUserWorkflows.schema";

const log = logger.getSubLogger({ prefix: ["admin"] });

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TWhitelistUserWorkflows;
};

const whitelistUserWorkflowsHandler = async ({ ctx, input }: GetOptions) => {
  const action = new ObservableAdminAction(getWhitelistUserWorkflowsAction(), {
    actionId: "whitelistUserWorkflows",
    actor: { id: ctx.user.id, email: ctx.user.email },
    logger: log,
  });

  return action.execute(input);
};

export default whitelistUserWorkflowsHandler;
