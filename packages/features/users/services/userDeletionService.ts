import {
  deleteStripeCustomer,
  disconnectStripeConnectAccount,
} from "@calcom/app-store/stripepayment/lib/customer";
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { User } from "@calcom/prisma/client";

import type { IUsersRepository } from "../users.repository.interface";

type UserDeletionServiceDeps = {
  usersRepository: IUsersRepository;
  credentialRepository: typeof CredentialRepository;
};

export class UserDeletionService {
  constructor(private deps: UserDeletionServiceDeps) {}

  async deleteUser(user: Pick<User, "id" | "email" | "metadata">): Promise<void> {
    await this.deleteStripeConnectAccounts(user.id);

    // If 2FA is disabled or totpCode is valid then delete the user from stripe and database
    await deleteStripeCustomer(user).catch(console.warn);
    // Remove my account
    await this.deps.usersRepository.delete(user.id);
  }

  private async deleteStripeConnectAccounts(userId: number): Promise<void> {
    const stripeCredentials = await this.deps.credentialRepository.findByUserIdAndType({
      userId,
      type: "stripe_payment",
      select: { key: true },
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
  }
}

