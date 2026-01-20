import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";

import type {
  QueuedFormResponseRepositoryFindManyArgs,
  QueuedFormResponseRepositoryFindManyWhere,
  QueuedFormResponseRepositoryInterface,
} from "./QueuedFormResponseRepository.interface";

const safeSelect = {
  id: true,
  formId: true,
  response: true,
  chosenRouteId: true,
  createdAt: true,
  updatedAt: true,
  actualResponseId: true,
};

export class PrismaQueuedFormResponseRepository implements QueuedFormResponseRepositoryInterface {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  private assertWhereIsNotEmpty(where: QueuedFormResponseRepositoryFindManyWhere) {
    let found = false;
    Object.entries(where).forEach(([_, value]) => {
      if (value !== undefined) {
        found = true;
      }
    });
    if (!found) {
      throw new Error("where is empty");
    }
  }

  async findMany({ where, params }: QueuedFormResponseRepositoryFindManyArgs) {
    this.assertWhereIsNotEmpty(where);
    return await this.prismaClient.app_RoutingForms_QueuedFormResponse.findMany({
      where,
      select: safeSelect,
      ...(params?.take && { take: params.take }),
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
}
