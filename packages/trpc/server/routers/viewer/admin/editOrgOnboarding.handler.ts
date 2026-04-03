import { ObservableAdminAction } from "@calcom/features/admin/actions/observable-admin-action";
import { getEditOrganizationOnboardingAction } from "@calcom/features/admin/di/container";
import logger from "@calcom/lib/logger";
import type { TrpcSessionUser } from "../../../types";
import type { TEditOrgOnboardingSchema } from "./editOrgOnboarding.schema";

const log = logger.getSubLogger({ prefix: ["admin"] });

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TEditOrgOnboardingSchema;
};

const editOrgOnboardingHandler = async ({ ctx, input }: GetOptions) => {
  const action = new ObservableAdminAction(getEditOrganizationOnboardingAction(), {
    actionId: "editOrgOnboarding",
    actor: { id: ctx.user.id, email: ctx.user.email },
    logger: log,
  });

  return action.execute(input);
};

export default editOrgOnboardingHandler;
