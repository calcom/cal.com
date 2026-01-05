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
    const update = {
      enabled: data.enabled,
      ...(data.generalPrompt !== undefined ? { generalPrompt: data.generalPrompt } : {}),
      ...(data.beginMessage !== undefined ? { beginMessage: data.beginMessage } : {}),
      ...(data.llmId !== undefined ? { llmId: data.llmId } : {}),
      ...(data.schedulerName !== undefined ? { schedulerName: data.schedulerName } : {}),
      ...(data.guestEmail !== undefined ? { guestEmail: data.guestEmail } : {}),
      ...(data.guestCompany !== undefined ? { guestCompany: data.guestCompany } : {}),
      ...(data.templateType != null ? { templateType: data.templateType } : {}),
      ...(data.yourPhoneNumber != null ? { yourPhoneNumber: data.yourPhoneNumber } : {}),
      ...(data.numberToCall != null ? { numberToCall: data.numberToCall } : {}),
    };

    const create = {
      eventTypeId,
      enabled: data.enabled,
      yourPhoneNumber: data.yourPhoneNumber ?? "",
      numberToCall: data.numberToCall ?? "",
      ...(data.generalPrompt !== undefined ? { generalPrompt: data.generalPrompt } : {}),
      ...(data.beginMessage !== undefined ? { beginMessage: data.beginMessage } : {}),
      ...(data.llmId !== undefined ? { llmId: data.llmId } : {}),
      ...(data.schedulerName !== undefined ? { schedulerName: data.schedulerName } : {}),
      ...(data.guestEmail !== undefined ? { guestEmail: data.guestEmail } : {}),
      ...(data.guestCompany !== undefined ? { guestCompany: data.guestCompany } : {}),
      ...(data.templateType != null ? { templateType: data.templateType } : {}),
    };

    return await this.prismaClient.aIPhoneCallConfiguration.upsert({
      where: { eventTypeId },
      update,
      create,
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
