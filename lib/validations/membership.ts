import { z } from "zod";

import { _MembershipModel as Membership } from "@calcom/prisma/zod";

export const schemaMembershipBaseBodyParams = Membership.omit({});
const schemaMembershipRequiredParams = z.object({
  teamId: z.number(),
});

export const schemaMembershipBodyParams = schemaMembershipBaseBodyParams.merge(
  schemaMembershipRequiredParams
);

export const schemaMembershipPublic = Membership.omit({});
