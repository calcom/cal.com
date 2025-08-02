import type { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

export class PhoneNumberRepository {
  static async findMinimalPhoneNumber({ phoneNumber, userId }: { phoneNumber: string; userId: number }) {
    return await prisma.calAiPhoneNumber.findUniqueOrThrow({
      where: {
        phoneNumber,
        userId,
      },
    });
  }
  static async findPhoneNumbersFromUserId({ userId }: { userId: number }) {
    return await prisma.calAiPhoneNumber.findMany({
      where: {
        userId,
        OR: [{ subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE }, { subscriptionStatus: null }],
      },
      include: {
        inboundAgent: {
          select: {
            id: true,
            name: true,
            retellAgentId: true,
          },
        },
        outboundAgent: {
          select: {
            id: true,
            name: true,
            retellAgentId: true,
          },
        },
      },
    });
  }
  static async findUnassignedPhoneNumbersFromUserId({ userId }: { userId: number }) {
    return await prisma.calAiPhoneNumber.findMany({
      where: {
        userId,
        subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
      },
    });
  }

  static async createPhoneNumber({
    phoneNumber,
    provider,
    userId,
    teamId,
  }: {
    phoneNumber: string;
    provider?: string;
    userId: number;
    teamId?: number;
  }) {
    return await prisma.calAiPhoneNumber.create({
      data: {
        provider,
        userId,
        teamId,
        phoneNumber,
      },
    });
  }

  static async deletePhoneNumber({ phoneNumber, userId }: { phoneNumber: string; userId: number }) {
    return await prisma.calAiPhoneNumber.delete({
      where: {
        phoneNumber,
        userId,
      },
    });
  }

  static async findById({ id, userId }: { id: number; userId: number }) {
    return await prisma.calAiPhoneNumber.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  static async findByIdWithTeamAccess({
    id,
    teamId,
    userId,
  }: {
    id: number;
    teamId: number;
    userId: number;
  }) {
    return await prisma.calAiPhoneNumber.findFirst({
      where: {
        id,
        teamId,
        team: {
          members: {
            some: {
              userId,
              accepted: true,
            },
          },
        },
      },
    });
  }

  static async findByPhoneNumberAndUserId({ phoneNumber, userId }: { phoneNumber: string; userId: number }) {
    return await prisma.calAiPhoneNumber.findFirst({
      where: {
        phoneNumber,
        userId,
      },
    });
  }

  static async findByPhoneNumberAndTeamId({
    phoneNumber,
    teamId,
    userId,
  }: {
    phoneNumber: string;
    teamId: number;
    userId: number;
  }) {
    return await prisma.calAiPhoneNumber.findFirst({
      where: {
        phoneNumber,
        teamId,
        team: {
          members: {
            some: {
              userId,
              accepted: true,
            },
          },
        },
      },
    });
  }

  static async updateSubscriptionStatus({
    id,
    subscriptionStatus,
    disconnectOutboundAgent = false,
  }: {
    id: number;
    subscriptionStatus: PhoneNumberSubscriptionStatus;
    disconnectOutboundAgent?: boolean;
  }) {
    const updateData: Prisma.CalAiPhoneNumberUpdateInput = {
      subscriptionStatus,
    };

    if (disconnectOutboundAgent) {
      updateData.outboundAgent = {
        disconnect: true,
      };
    }

    return await prisma.calAiPhoneNumber.update({
      where: {
        id,
      },
      data: updateData,
    });
  }

  static async updateAgents({
    id,
    inboundAgentId,
    outboundAgentId,
  }: {
    id: number;
    inboundAgentId?: string | null;
    outboundAgentId?: string | null;
  }) {
    const updateData: Prisma.CalAiPhoneNumberUpdateInput = {};

    if (inboundAgentId !== undefined) {
      if (inboundAgentId) {
        updateData.inboundAgent = {
          connect: { retellAgentId: inboundAgentId },
        };
      } else {
        updateData.inboundAgent = { disconnect: true };
      }
    }

    if (outboundAgentId !== undefined) {
      if (outboundAgentId) {
        updateData.outboundAgent = {
          connect: { retellAgentId: outboundAgentId },
        };
      } else {
        updateData.outboundAgent = { disconnect: true };
      }
    }

    return await prisma.calAiPhoneNumber.update({
      where: {
        id,
      },
      data: updateData,
    });
  }

  static async updatePhoneNumberByUserId({
    phoneNumber,
    userId,
    data,
  }: {
    phoneNumber: string;
    userId: number;
    data: { outboundAgentId: string };
  }) {
    return await prisma.calAiPhoneNumber.updateMany({
      where: {
        phoneNumber,
        userId,
      },
      data,
    });
  }
}
