import type { User } from "@prisma/client";

import { deleteStripeCustomer } from "@calcom/app-store/stripepayment/lib/customer";
import logger from "@calcom/lib/logger";
import SendgridService from "@calcom/lib/sync/services/SendgridService";
import prisma from "@calcom/prisma";

export async function deleteUser(user: Pick<User, "id" | "email" | "metadata">) {
  // If 2FA is disabled or totpCode is valid then delete the user from stripe and database
  await deleteStripeCustomer(user).catch(console.warn);

  // Remove my account
  // TODO: Move this to Repository pattern.
  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });

  try {
    const sendgridService = new SendgridService();
    await sendgridService.web.user.delete({
      email: user.email,
      id: user.id,
      name: null,
      username: null,
      createdDate: new Date(),
      plan: "PRO",
    });
    logger.info(`Successfully removed user ${user.email} from SendGrid`);
  } catch (error) {
    logger.warn(`Failed to remove user ${user.email} from SendGrid: ${error}`);
  }
}
