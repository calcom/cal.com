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

  static async findFormResponseIncludeForm({ routingFormResponseId }: { routingFormResponseId: number }) {
    return await prisma.app_RoutingForms_FormResponse.findUnique({
      where: {
        id: routingFormResponseId,
      },
      select: {
        response: true,
        form: {
          select: {
            routes: true,
            fields: true,
          },
        },
        chosenRouteId: true,
      },
    });
  }

  static async findQueuedFormResponseIncludeForm({ queuedFormResponseId }: { queuedFormResponseId: string }) {
    return await prisma.app_RoutingForms_QueuedFormResponse.findUnique({
      where: {
        id: queuedFormResponseId,
      },
      select: {
        response: true,
        form: {
          select: {
            routes: true,
            fields: true,
          },
        },
        chosenRouteId: true,
      },
    });
  }

  static async getQueuedFormResponseFromId(id: string) {
    return await prisma.app_RoutingForms_QueuedFormResponse.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        formId: true,
        response: true,
        chosenRouteId: true,
        createdAt: true,
        updatedAt: true,
        actualResponseId: true,
        form: {
          select: {
            team: {
              select: {
                parentId: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
              },
            },
            id: true,
            description: true,
            position: true,
            routes: true,
            createdAt: true,
            updatedAt: true,
            name: true,
            fields: true,
            updatedById: true,
            userId: true,
            teamId: true,
            disabled: true,
            settings: true,
          },
        },
      },
    });
  }
}
