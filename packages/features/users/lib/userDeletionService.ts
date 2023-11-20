import type { User } from "@prisma/client";

import { deleteStripeCustomer } from "@calcom/app-store/stripepayment/lib/customer";
import { deleteWebUser as syncServicesDeleteWebUser } from "@calcom/lib/sync/SyncServiceManager";
import prisma from "@calcom/prisma";

export async function deleteUser(user: Pick<User, "id" | "email" | "metadata">) {
  // If 2FA is disabled or totpCode is valid then delete the user from stripe and database
  await deleteStripeCustomer(user).catch(console.warn);
  // Remove my account
  // TODO: Move this to Repository pattern.
  const deletedUser = await prisma.user.delete({
    where: {
      id: user.id,
    },
  });

  // Sync Services
  syncServicesDeleteWebUser(deletedUser);
}
