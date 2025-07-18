import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { QueuedFormResponseRepositoryInterface } from "./QueuedFormResponseRepository.interface";

export class PrismaQueuedFormResponseRepository implements QueuedFormResponseRepositoryInterface {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async findExpiredResponses(params: { cutoffTime: Date; take: number }) {
    return await this.prismaClient.app_RoutingForms_QueuedFormResponse.findMany({
      where: {
        AND: [
          {
            actualResponseId: null,
          },
          {
            createdAt: {
              lt: params.cutoffTime,
            },
          },
        ],
      },
      select: { id: true },
      take: params.take,
    });
  }

  async deleteByIds(ids: string[]) {
    return await this.prismaClient.app_RoutingForms_QueuedFormResponse.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async findById(id: string) {
    return await this.prismaClient.app_RoutingForms_QueuedFormResponse.findUnique({
      where: {
        id,
      },
    });
  }

  async create(data: { formId: string; response: unknown; chosenRouteId: string | null }) {
    return await this.prismaClient.app_RoutingForms_QueuedFormResponse.create({
      data: {
        formId: data.formId,
        response: data.response as Prisma.InputJsonValue,
        chosenRouteId: data.chosenRouteId,
      },
    });
  }

  async findByIdIncludeForm(id: string) {
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
            routes: true,
            fields: true,
          },
        },
      },
    });
  }
}