import type { PrismaClient } from "@calcom/prisma";

export class AIPhoneCallConfigRepository {
  constructor(private prismaClient: PrismaClient) {}

  async upsert({
    eventTypeId,
    data,
  }: {
    eventTypeId: number;
    data: {
      enabled: boolean;
      generalPrompt?: string | null;
      beginMessage?: string | null;
      llmId?: string | null;
      guestEmail?: string | null;
      guestCompany?: string | null;
      yourPhoneNumber?: string | null;
      numberToCall?: string | null;
      templateType?: string | null;
      schedulerName?: string | null;
    };
  }) {
    return await this.prismaClient.aIPhoneCallConfiguration.upsert({
      where: {
        eventTypeId,
      },
      update: {
        ...data,
        guestEmail: data.guestEmail ?? null,
        guestCompany: data.guestCompany ?? null,
      },
      create: {
        ...data,
        guestEmail: data.guestEmail ?? null,
        guestCompany: data.guestCompany ?? null,
        eventTypeId,
      },
    });
  }

  async deleteByEventTypeId({ eventTypeId }: { eventTypeId: number }) {
    return await this.prismaClient.aIPhoneCallConfiguration.delete({
      where: {
        eventTypeId,
      },
    });
  }
}
