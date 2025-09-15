import type { GetServerSidePropsContext, NextApiResponse } from "next";

import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

type UpdateProfileOptions = {
  ctx: {
    user: {
      id: number;
      identityProvider: IdentityProvider;
      identityProviderId: string | null;
    };
    res?: NextApiResponse | GetServerSidePropsContext["res"];
  };
};

const unlinkConnectedAccount = async ({ ctx }: UpdateProfileOptions) => {
  const { user } = ctx;
  // Unlink the account
  const CalComAdapter = (await import("@calcom/features/auth/lib/next-auth-custom-adapter")).default;
  const calcomAdapter = CalComAdapter(prisma);
  const provider = user.identityProvider.toLocaleLowerCase();
  // If it fails to delete, don't stop because the users login data might not be present
  try {
    // if fn doesn't exist, do nothing.
    if (calcomAdapter.unlinkAccount) {
      await calcomAdapter.unlinkAccount({
        provider,
        providerAccountId: user.identityProviderId || "",
      });
    }
  } catch {
    // Fail silently if we don't have a record in the account table
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
    select: {
      id: true,
    },
  });
  if (!_user) return { message: "account_unlinked_error" };
  return { message: "account_unlinked_success" };
};

export default unlinkConnectedAccount;
