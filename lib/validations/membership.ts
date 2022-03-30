import { withValidation } from "next-validations";

import { _MembershipModel as Membership } from "@calcom/prisma/zod";

export const schemaMembershipBodyParams = Membership.omit({});

export const schemaMembershipPublic = Membership.omit({});

export const withValidMembership = withValidation({
  schema: schemaMembershipBodyParams,
  type: "Zod",
  mode: "body",
});
