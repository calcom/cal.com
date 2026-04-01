import { getLockUserAccountAction } from "@calcom/features/admin/di/container";
import { ObservableAdminAction } from "@calcom/features/admin/actions/observable-admin-action";
import logger from "@calcom/lib/logger";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminLockUserAccountSchema } from "./lockUserAccount.schema";

const log = logger.getSubLogger({ prefix: ["admin"] });

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminLockUserAccountSchema;
};

const lockUserAccountHandler = async ({ ctx, input }: GetOptions) => {
  const action = new ObservableAdminAction(getLockUserAccountAction(), {
    actionId: "lockUserAccount",
    actor: { id: ctx.user.id, email: ctx.user.email },
    logger: log,
  });

  return action.execute(input);
};

export default lockUserAccountHandler;
