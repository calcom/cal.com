import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

interface RecordFormResponseInput {
  formId: string;
  response: Record<string, any> | Prisma.JsonValue;
  chosenRouteId: string | null;
}

export class RoutingFormResponseRepository {
  private static generateCreateFormResponseData(
    input: RecordFormResponseInput & { queuedFormResponseId?: string | null }
  ) {
    return {
      formId: input.formId,
      response: input.response as Prisma.InputJsonValue,
      chosenRouteId: input.chosenRouteId,
      ...(input.queuedFormResponseId
        ? {
            queuedFormResponse: {
              connect: {
                id: input.queuedFormResponseId,
              },
            },
          }
        : {}),
    };
  }

  static async recordFormResponse(
    input: RecordFormResponseInput & {
      queuedFormResponseId?: string | null;
    }
  ) {
    return await prisma.app_RoutingForms_FormResponse.create({
      data: this.generateCreateFormResponseData(input),
    });
  }

  static async recordQueuedFormResponse(input: RecordFormResponseInput) {
    return await prisma.app_RoutingForms_QueuedFormResponse.create({
      data: this.generateCreateFormResponseData(input),
    });
  }
}
