import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

const aiSelfServeConfigurationSelect = {
  id: true,
  eventTypeId: true,
  yourPhoneNumberId: true,
  numberToCall: true,
  enabled: true,
  agentId: true,
  llmId: true,
  agentTimeZone: true,
} satisfies Prisma.AISelfServeConfigurationSelect;

const aiSelfServeConfigurationSelectWithRelations = {
  ...aiSelfServeConfigurationSelect,
  eventType: {
    select: {
      id: true,
      title: true,
      userId: true,
      teamId: true,
    },
  },
  yourPhoneNumber: {
    select: {
      id: true,
      phoneNumber: true,
      userId: true,
      subscriptionStatus: true,
    },
  },
} satisfies Prisma.AISelfServeConfigurationSelect;

export class AISelfServeConfigurationRepository {
  static async findById({ id }: { id: number }) {
    return prisma.aISelfServeConfiguration.findUnique({
      where: { id },
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async findByEventTypeId({ eventTypeId }: { eventTypeId: number }) {
    return await prisma.aISelfServeConfiguration.findUnique({
      where: { eventTypeId },
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async findByEventTypeIdAndUserId({ eventTypeId, userId }: { eventTypeId: number; userId: number }) {
    return prisma.aISelfServeConfiguration.findFirst({
      where: {
        eventTypeId,
        eventType: {
          userId,
        },
      },
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async findByLlmIdAndUserId({ llmId, userId }: { llmId: string; userId: number }) {
    return prisma.aISelfServeConfiguration.findFirst({
      where: {
        llmId,
        eventType: {
          userId,
        },
      },
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async findByAgentIdAndUserId({ agentId, userId }: { agentId: string; userId: number }) {
    return prisma.aISelfServeConfiguration.findFirst({
      where: {
        agentId,
        eventType: {
          userId,
        },
      },
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async create({
    eventTypeId,
    agentId,
    llmId,
    agentTimeZone,
    yourPhoneNumberId,
    numberToCall,
    enabled = false,
  }: {
    eventTypeId: number;
    agentId: string;
    llmId: string;
    agentTimeZone: string;
    yourPhoneNumberId?: number;
    numberToCall?: string;
    enabled?: boolean;
  }) {
    return prisma.aISelfServeConfiguration.create({
      data: {
        eventTypeId,
        agentId,
        llmId,
        agentTimeZone,
        yourPhoneNumberId,
        numberToCall,
        enabled,
      },
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async update({ id, data }: { id: number; data: Prisma.AISelfServeConfigurationUpdateInput }) {
    return prisma.aISelfServeConfiguration.update({
      where: { id },
      data,
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async updateByEventTypeId({
    eventTypeId,
    data,
  }: {
    eventTypeId: number;
    data: Prisma.AISelfServeConfigurationUpdateInput;
  }) {
    return prisma.aISelfServeConfiguration.update({
      where: { eventTypeId },
      data,
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async updatePhoneNumberAssignment({
    configId,
    yourPhoneNumberId,
  }: {
    configId: number;
    yourPhoneNumberId: number | null;
  }) {
    return prisma.aISelfServeConfiguration.update({
      where: { id: configId },
      data: { yourPhoneNumberId },
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async removePhoneNumberFromConfigurations({ phoneNumberId }: { phoneNumberId: number }) {
    return prisma.aISelfServeConfiguration.updateMany({
      where: { yourPhoneNumberId: phoneNumberId },
      data: { yourPhoneNumberId: null },
    });
  }

  static async delete({ id }: { id: number }) {
    return prisma.aISelfServeConfiguration.delete({
      where: { id },
      select: aiSelfServeConfigurationSelect,
    });
  }

  static async deleteByEventTypeId({ eventTypeId }: { eventTypeId: number }) {
    return prisma.aISelfServeConfiguration.delete({
      where: { eventTypeId },
      select: aiSelfServeConfigurationSelect,
    });
  }

  static async findAllByUserId({ userId }: { userId: number }) {
    return prisma.aISelfServeConfiguration.findMany({
      where: {
        eventType: {
          userId,
        },
      },
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async findByPhoneNumberId({ phoneNumberId }: { phoneNumberId: number }) {
    return prisma.aISelfServeConfiguration.findFirst({
      where: { yourPhoneNumberId: phoneNumberId },
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }

  static async toggleEnabled({ id, enabled }: { id: number; enabled: boolean }) {
    return prisma.aISelfServeConfiguration.update({
      where: { id },
      data: { enabled },
      select: aiSelfServeConfigurationSelect,
    });
  }

  static async updateCallConfiguration({
    id,
    numberToCall,
    enabled,
  }: {
    id: number;
    numberToCall?: string;
    enabled?: boolean;
  }) {
    return prisma.aISelfServeConfiguration.update({
      where: { id },
      data: {
        ...(numberToCall !== undefined && { numberToCall }),
        ...(enabled !== undefined && { enabled }),
      },
      select: aiSelfServeConfigurationSelectWithRelations,
    });
  }
}
