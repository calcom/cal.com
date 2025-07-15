import { captureException } from "@sentry/nextjs";

import prisma from "@calcom/prisma";

import type { IPlatformOAuthClientRepository } from "./platformOauthClientRepositoryInterface";

export class PlatformOAuthClientRepository implements IPlatformOAuthClientRepository {
  async getByUserId(userId: number) {
    try {
      return prisma.platformOAuthClient.findFirst({
        where: {
          users: {
            some: {
              id: userId,
            },
          },
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
