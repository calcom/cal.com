import type { PrismaClient } from "@calcom/prisma";

export class OrganizationSettingsRepository {
  constructor(private prismaClient: PrismaClient) {}

  async getEmailSettings(organizationId: number) {
    return await this.prismaClient.organizationSettings.findUnique({
      where: { organizationId },
      select: {
        disableGuestConfirmationEmail: true,
        disableGuestCancellationEmail: true,
        disableGuestRescheduledEmail: true,
        disableGuestRequestEmail: true,
      },
    });
  }
}
