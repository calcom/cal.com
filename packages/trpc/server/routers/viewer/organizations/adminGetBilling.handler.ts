// Organizations are just teams with isOrganization: true
// Delegate to the teams.adminGetBilling handler to avoid duplication
import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetBilling } from "./adminGetBilling.schema";

type AdminGetBillingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetBilling;
};

export const adminGetBillingHandler = async ({ input, ctx }: AdminGetBillingOptions) => {
  // Import the teams handler and reuse it
  const { default: teamsAdminGetBillingHandler } = await import("../teams/adminGetBilling.handler");
  return teamsAdminGetBillingHandler({ input, ctx });
};

export default adminGetBillingHandler;
