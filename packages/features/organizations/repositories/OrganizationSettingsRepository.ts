import type { PrismaClient } from "@calcom/prisma";

export class OrganizationSettingsRepository {
  constructor(private prismaClient: PrismaClient) {}

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
}
