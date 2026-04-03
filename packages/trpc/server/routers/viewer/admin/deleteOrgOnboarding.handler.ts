import { ObservableAdminAction } from "@calcom/features/admin/actions/observable-admin-action";
import { getDeleteOrganizationOnboardingAction } from "@calcom/features/admin/di/container";
import logger from "@calcom/lib/logger";
import type { TrpcSessionUser } from "../../../types";
import type { TDeleteOrgOnboardingSchema } from "./deleteOrgOnboarding.schema";

const log = logger.getSubLogger({ prefix: ["admin"] });

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteOrgOnboardingSchema;
};

const deleteOrgOnboardingHandler = async ({ ctx, input }: GetOptions) => {
  const action = new ObservableAdminAction(getDeleteOrganizationOnboardingAction(), {
    actionId: "deleteOrgOnboarding",
    actor: { id: ctx.user.id, email: ctx.user.email },
    logger: log,
  });

  return action.execute(input);
};

export default deleteOrgOnboardingHandler;
