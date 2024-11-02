import type { Credentials } from "google-auth-library";

import { prisma } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";

export class CredentialRepository {
  static async createGoogleCalendar({ userId, key }: { userId: number; key: Credentials }) {
    return await prisma.credential.create({
      data: {
        type: "google_calendar",
        key,
        userId,
        appId: "google-calendar",
      },
    });
  }

  static async createGoogleMeets({ userId }: { userId: number }) {
    return await prisma.credential.create({
      data: {
        type: "google_video",
        key: {},
        userId,
        appId: "google-meet",
      },
    });
  }

  /**
   * Doesn't retrieve key field as that has credentials
   */
  static async findFirstByIdWithUser({ id }: { id: number }) {
    return await prisma.credential.findFirst({ where: { id }, select: safeCredentialSelect });
  }

  /**
   * Includes 'key' field which is sensitive data.
   */
  static async findFirstByIdWithKeyAndUser({ id }: { id: number }) {
    return await prisma.credential.findFirst({
      where: { id },
      select: { ...safeCredentialSelect, key: true },
    });
  }

  static async findFirstByAppIdAndUserId({ appId, userId }: { appId: string; userId: number }) {
    return await prisma.credential.findFirst({
      where: {
        appId,
        userId,
      },
    });
  }

  static async findGoogleMeetCredential({ userId }: { userId: number }) {
    return await prisma.credential.findFirst({
      where: {
        userId,
        type: "google_video",
      },
    });
  }

  static async deleteById({ id }: { id: number }) {
    await prisma.credential.delete({ where: { id } });
  }
}
