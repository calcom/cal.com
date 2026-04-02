import { passwordResetRequest } from "@calcom/features/auth/lib/passwordResetRequest";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TOrgPasswordResetSchema } from "./sendPasswordReset.schema";

type SendPasswordResetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    organizationId: number;
  };
  input: TOrgPasswordResetSchema;
};

const sendPasswordResetHandler = async ({ ctx, input }: SendPasswordResetOptions) => {
  const { organizationId } = ctx;
  const { userId } = input;

  if (userId === ctx.user.id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot reset your own password through this endpoint.",
    });
  }

  const membershipRepository = new MembershipRepository();
  const targetMembership = await membershipRepository.findUniqueByUserIdAndTeamId({
    userId,
    teamId: organizationId,
  });

  if (!targetMembership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User is not a member of this organization.",
    });
  }

  if (targetMembership.role === MembershipRole.OWNER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot reset password for an organization owner.",
    });
  }

  const userRepository = new UserRepository(prisma);
  const user = await userRepository.findForPasswordReset({ id: userId });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }

  await passwordResetRequest(user);

  return { success: true };
};

export default sendPasswordResetHandler;
