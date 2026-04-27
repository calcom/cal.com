import { deleteStripeCustomer } from "@calcom/app-store/stripepayment/lib/customer";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["deleteUser"] });

export async function deleteUser(user: Pick<User, "id" | "email" | "metadata">) {
  // If 2FA is disabled or totpCode is valid then delete the user from stripe and database
  await deleteStripeCustomer(user).catch((err) => log.warn("Failed to delete Stripe customer", { userId: user.id, err }));
  // Remove my account
  // TODO: Move this to Repository pattern.
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });
}
