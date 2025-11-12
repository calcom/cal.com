import type { PrismaClient } from "@calcom/prisma/client";
import { WorkflowContactType } from "@calcom/prisma/enums";

export class WorkflowOptOutContactRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async addPhoneNumber(phoneNumber: string) {
    await this.prismaClient.workflowOptOutContact.upsert({
      where: {
        type_value: {
          type: WorkflowContactType.PHONE,
          value: phoneNumber,
        },
      },
      update: {
        optedOut: true,
      },
      create: {
        type: WorkflowContactType.PHONE,
        optedOut: true,
        value: phoneNumber,
      },
    });
  }

  async removePhoneNumber(phoneNumber: string) {
    await this.prismaClient.workflowOptOutContact.update({
      where: {
        type_value: {
          type: WorkflowContactType.PHONE,
          value: phoneNumber,
        },
      },
      data: {
        optedOut: false,
      },
    });
  }

  async isOptedOut(phoneNumber: string) {
    const optOutContact = await this.prismaClient.workflowOptOutContact.findFirst({
      where: {
        type: WorkflowContactType.PHONE,
        value: phoneNumber,
        optedOut: true,
      },
      select: {
        optedOut: true,
      },
    });
    return !!optOutContact?.optedOut;
  }
}
