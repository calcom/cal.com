import type { GetServerSidePropsContext, NextApiResponse } from "next";

import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type UpdateProfileOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
  };
};

const unlinkConnectedAccount = async ({ ctx }: UpdateProfileOptions) => {
  const { user } = ctx;
  // Unlink the account
  const CalComAdapter = (await import("@calcom/features/auth/lib/next-auth-custom-adapter")).default;
  const calcomAdapter = CalComAdapter(prisma);
  // If it fails to delete, don't stop because the users login data might not be present
  try {
    await calcomAdapter.unlinkAccount({
      provider: user.identityProvider.toLocaleLowerCase(),
      providerAccountId: user.identityProviderId || "",
    });
  } catch {
    // Fail silenty if we don't have an record in the account table
  }
  // Fall back to the default identity provider
  const _user = await prisma.user.update({
    where: {
      id: user.id,
      identityProvider: IdentityProvider.GOOGLE,
      identityProviderId: { not: null },
    },
    data: {
      identityProvider: IdentityProvider.CAL,
      identityProviderId: null,
    },
  });
  if (!_user) return { message: "account_unlinked_error" };
  return { message: "account_unlinked_success" };
};

export default unlinkConnectedAccount;
