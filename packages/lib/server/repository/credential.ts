import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

type ICreateCredential =
  | (
      | {
          userId: number | null;
          profileId: number | null;
        }
      | {
          teamId: number | null;
        }
    ) & {
      type: string;
      key: Prisma.InputJsonValue;
      appId: string | null;
      subscriptionId?: string | null;
      paymentStatus?: string | null;
      billingCycleStart?: number | null;
    };

export class CredentialRepository {
  static async create(data: ICreateCredential) {
    const { billingCycleStart, paymentStatus, subscriptionId, appId, type, key } = data;
    return await prisma.credential.create({
      data: {
        billingCycleStart,
        paymentStatus,
        subscriptionId,
        type,
        key,
        ...(appId
          ? {
              app: {
                connect: {
                  slug: appId,
                },
              },
            }
          : null),
        ...("userId" in data && data.userId
          ? {
              user: {
                connect: {
                  id: data.userId,
                },
              },
            }
          : null),
        ...("teamId" in data && data.teamId
          ? {
              user: {
                connect: {
                  id: data.teamId,
                },
              },
            }
          : null),
        ...("profileId" in data && data.profileId
          ? {
              profile: {
                connect: {
                  id: data.profileId,
                },
              },
            }
          : null),
      },
    });
  }
}
