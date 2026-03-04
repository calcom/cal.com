import { deleteStripeCustomer } from "@calcom/app-store/stripepayment/lib/customer";
import { intercom } from "@calcom/lib/intercom/intercom";
import syncServices from "@calcom/lib/sync/services";
import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";

export async function deleteUser(user: Pick<User, "id" | "email" | "metadata" | "username" | "name" | "createdDate">) {
  // If 2FA is disabled or totpCode is valid then delete the user from stripe and database
  await deleteStripeCustomer(user).catch(console.warn);

  // Notify Sync Services (e.g. SendGrid)
  for (const Service of syncServices) {
    const serviceInstance = new Service();
    if (serviceInstance.ready()) {
      try {
        await serviceInstance.web.user.delete({
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          username: user.username ?? null,
          createdDate: user.createdDate,
        });
      } catch (e) {
        console.error(`Error deleting user from sync service ${Service.name}:`, e);
      }
    }
  }

  // Notify Intercom
  await intercom
    .deleteContact(user.email)
    .catch((e) => console.error("Error deleting Intercom contact:", e));

  // Remove my account
  // TODO: Move this to Repository pattern.
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });
}
