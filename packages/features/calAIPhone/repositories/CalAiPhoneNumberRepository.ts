import { prisma } from "@calcom/prisma";

export class CalAiPhoneNumberRepository {
  static async getUserPhoneNumbers(userId: number) {
    return prisma.calAiPhoneNumber.findMany({
      where: { userId },
      select: { phoneNumber: true },
    });
  }

  static async getOrganizationTeamPhoneNumbers(organizationId: number) {
    return prisma.calAiPhoneNumber.findMany({
      where: {
        team: { parentId: organizationId },
      },
      select: { phoneNumber: true },
    });
  }

  static async getTeamPhoneNumbers(teamIds: number[]) {
    return prisma.calAiPhoneNumber.findMany({
      where: { teamId: { in: teamIds } },
      select: { phoneNumber: true },
    });
  }

  static async getAccessiblePhoneNumbers({
    userId,
    organizationId,
    isOrgOwner,
    adminTeamIds,
  }: {
    userId: number;
    organizationId?: number;
    isOrgOwner: boolean;
    adminTeamIds: number[];
  }): Promise<string[]> {
    const userPhoneNumbers = await this.getUserPhoneNumbers(userId);

    let teamPhoneNumbers: Array<{ phoneNumber: string }> = [];
    if (isOrgOwner && organizationId) {
      teamPhoneNumbers = await this.getOrganizationTeamPhoneNumbers(organizationId);
    } else if (adminTeamIds.length > 0) {
      teamPhoneNumbers = await this.getTeamPhoneNumbers(adminTeamIds);
    }

    const allPhoneNumbers = [
      ...userPhoneNumbers.map((p) => p.phoneNumber),
      ...teamPhoneNumbers.map((p) => p.phoneNumber),
    ];

    return Array.from(new Set(allPhoneNumbers));
  }
}
