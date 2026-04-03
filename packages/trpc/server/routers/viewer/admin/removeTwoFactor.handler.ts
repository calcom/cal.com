import { ObservableAdminAction } from "@calcom/features/admin/actions/observable-admin-action";
import { getRemoveTwoFactorAction } from "@calcom/features/admin/di/container";
import logger from "@calcom/lib/logger";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminRemoveTwoFactor } from "./removeTwoFactor.schema";

const log = logger.getSubLogger({ prefix: ["admin"] });

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminRemoveTwoFactor;
};

const removeTwoFactorHandler = async ({ ctx, input }: GetOptions) => {
  const action = new ObservableAdminAction(getRemoveTwoFactorAction(), {
    actionId: "removeTwoFactor",
    actor: { id: ctx.user.id, email: ctx.user.email },
    logger: log,
  });

  return action.execute(input);
};

export default removeTwoFactorHandler;
