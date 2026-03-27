import { getOAuthAuthorizationRepository } from "@calcom/features/oauth/di/OAuthAuthorizationRepository.container";
import { getOAuthClientRepository } from "@calcom/features/oauth/di/OAuthClientRepository.container";
import { UserPermissionRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TListAuthorizedUsersInputSchema } from "./listAuthorizedUsers.schema";

type ListAuthorizedUsersOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "role">;
  };
  input: TListAuthorizedUsersInputSchema;
};

export const listAuthorizedUsersHandler = async ({ ctx, input }: ListAuthorizedUsersOptions) => {
  const oAuthClientRepository = getOAuthClientRepository();
  const client = await oAuthClientRepository.findByClientId(input.clientId);
  const isAdmin = ctx.user.role === UserPermissionRole.ADMIN;

  if (!client || (client.userId !== ctx.user.id && !isAdmin)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "OAuth client not found" });
  }

  const oAuthAuthorizationRepository = getOAuthAuthorizationRepository();
  return oAuthAuthorizationRepository.findByClientIdIncludeUser(input.clientId, input.page, input.pageSize);
};
