import prisma from "@calcom/prisma";
import { WorkflowContactType } from "@calcom/prisma/enums";

export class WorkflowOptOutContactRepository {
  static async addPhoneNumber(phoneNumber: string) {
    await prisma.workflowOptOutContact.upsert({
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

  static async removePhoneNumber(phoneNumber: string) {
    await prisma.workflowOptOutContact.update({
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

  static async isOptedOut(phoneNumber: string) {
    const optOutContact = await prisma.workflowOptOutContact.findFirst({
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
