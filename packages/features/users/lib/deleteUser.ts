import {
  deleteStripeCustomer,
  disconnectStripeConnectAccount,
} from "@calcom/app-store/stripepayment/lib/customer";
import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";

export async function deleteUser(user: Pick<User, "id" | "email" | "metadata">) {
  const stripeCredentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
      type: "stripe_payment",
    },
    select: {
      key: true,
    },
  });

  for (const credential of stripeCredentials) {
    try {
      const credentialKey = credential.key as { stripe_user_id?: string };
      if (credentialKey?.stripe_user_id) {
        await disconnectStripeConnectAccount(credentialKey.stripe_user_id);
      }
    } catch (error) {
      console.warn("Failed to disconnect Stripe Connect account:", error);
    }
  }

  // If 2FA is disabled or totpCode is valid then delete the user from stripe and database
  await deleteStripeCustomer(user).catch(console.warn);
  // Remove my account
  // TODO: Move this to Repository pattern.
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });
}
