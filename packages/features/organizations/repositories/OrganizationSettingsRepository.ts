import type { PrismaClient } from "@calcom/prisma";

export class OrganizationSettingsRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async getEmailSettings(organizationId: number) {
    return await this.prismaClient.organizationSettings.findUnique({
      where: { organizationId },
      select: {
        disableAttendeeConfirmationEmail: true,
        disableAttendeeCancellationEmail: true,
        disableAttendeeRescheduledEmail: true,
        disableAttendeeRequestEmail: true,
        disableAttendeeReassignedEmail: true,
        disableAttendeeAwaitingPaymentEmail: true,
        disableAttendeeRescheduleRequestEmail: true,
        disableAttendeeLocationChangeEmail: true,
        disableAttendeeNewEventEmail: true,
      },
    });
  }

  // Returns array for future multi-domain support
  async getVerifiedDomains(organizationId: number): Promise<string[]> {
    const settings = await this.prismaClient.organizationSettings.findUnique({
      where: { organizationId },
      select: {
        isOrganizationVerified: true,
        orgAutoAcceptEmail: true,
      },
    });

    if (!settings?.isOrganizationVerified) {
      return [];
    }

    const domain = settings.orgAutoAcceptEmail;
    return domain ? [domain.toLowerCase()] : [];
  }
}
