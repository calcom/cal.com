import { z } from "zod";

import { MembershipRole } from "@calcom/prisma/enums";
import { _MembershipModel as Membership, _TeamModel } from "@calcom/prisma/zod";
import { stringOrNumber } from "@calcom/prisma/zod-utils";

import { schemaQueryIdAsString } from "~/lib/validations/shared/queryIdString";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

export const schemaMembershipBaseBodyParams = Membership.omit({});

const schemaMembershipRequiredParams = z.object({
  teamId: z.number(),
});

export const membershipCreateBodySchema = Membership.omit({ id: true })
  .partial({
    accepted: true,
    role: true,
    disableImpersonation: true,
  })
  .transform((v) => ({
    accepted: false,
    role: MembershipRole.MEMBER,
    disableImpersonation: false,
    ...v,
  }));

export const membershipEditBodySchema = Membership.omit({
  /** To avoid complication, let's avoid updating these, instead you can delete and create a new invite */
  teamId: true,
  userId: true,
  id: true,
})
  .partial({
    accepted: true,
    role: true,
    disableImpersonation: true,
  })
  .strict();

export const schemaMembershipBodyParams = schemaMembershipBaseBodyParams.merge(
  schemaMembershipRequiredParams
);

export const schemaMembershipPublic = Membership.merge(z.object({ team: _TeamModel }).partial());

/** We extract userId and teamId from compound ID string */
export const membershipIdSchema = schemaQueryIdAsString
  // So we can query additional team data in memberships
  .merge(z.object({ teamId: z.union([stringOrNumber, z.array(stringOrNumber)]) }).partial())
  .transform((v, ctx) => {
    const [userIdStr, teamIdStr] = v.id.split("_");
    const userIdInt = schemaQueryIdParseInt.safeParse({ id: userIdStr });
    const teamIdInt = schemaQueryIdParseInt.safeParse({ id: teamIdStr });
    if (!userIdInt.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "userId is not a number" });
      return z.NEVER;
    }
    if (!teamIdInt.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "teamId is not a number " });
      return z.NEVER;
    }
    return {
      userId: userIdInt.data.id,
      teamId: teamIdInt.data.id,
    };
  });
