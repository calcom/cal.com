import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

interface RecordFormResponseInput {
  formId: string;
  response: Record<string, any> | Prisma.JsonValue;
  chosenRouteId: string | null;
}

export class RoutingFormResponseRepository {
  constructor(private prismaClient: PrismaClient) {}

  private generateCreateFormResponseData(
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

  async recordFormResponse(
    input: RecordFormResponseInput & {
      queuedFormResponseId?: string | null;
    }
  ) {
    return await this.prismaClient.app_RoutingForms_FormResponse.create({
      data: this.generateCreateFormResponseData(input),
    });
  }

  async recordQueuedFormResponse(input: RecordFormResponseInput) {
    return await this.prismaClient.app_RoutingForms_QueuedFormResponse.create({
      data: this.generateCreateFormResponseData(input),
    });
  }

  async findFormResponseIncludeForm({ routingFormResponseId }: { routingFormResponseId: number }) {
    return await this.prismaClient.app_RoutingForms_FormResponse.findUnique({
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

  async findQueuedFormResponseIncludeForm({ queuedFormResponseId }: { queuedFormResponseId: string }) {
    return await this.prismaClient.app_RoutingForms_QueuedFormResponse.findUnique({
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

  async getQueuedFormResponseFromId(id: string) {
    return await this.prismaClient.app_RoutingForms_QueuedFormResponse.findUnique({
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
                timeFormat: true,
                locale: true,
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

  async findAllResponsesWithBooking({
    formId,
    responseId,
    createdAfter,
    createdBefore,
  }: {
    formId: string;
    responseId: number;
    createdAfter: Date;
    createdBefore: Date;
  }) {
    return await this.prismaClient.app_RoutingForms_FormResponse.findMany({
      where: {
        formId,
        createdAt: {
          gte: createdAfter,
          lt: createdBefore,
        },
        routedToBookingUid: {
          not: null,
        },
        NOT: {
          id: responseId,
        },
      },
      select: {
        id: true,
        response: true,
      },
    });
  }
}
