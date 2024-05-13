import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

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
    return { message: "account_unlinked_error" };
  }
  // Fall back to the default identity provider
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      identityProvider: IdentityProvider.CAL,
      identityProviderId: null,
    },
  });
  return { message: "account_unlinked_success" };
};

export default unlinkConnectedAccount;
