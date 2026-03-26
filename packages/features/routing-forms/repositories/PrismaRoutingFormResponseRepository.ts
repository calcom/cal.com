import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";

import type { RoutingFormResponseRepositoryInterface } from "./RoutingFormResponseRepository.interface";

export class PrismaRoutingFormResponseRepository implements RoutingFormResponseRepositoryInterface {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  findByIdIncludeForm(id: number) {
    return this.prismaClient.app_RoutingForms_FormResponse.findUnique({
      where: {
        id,
      },
      select: {
        response: true,
        form: {
          select: {
            fields: true,
            name: true,
            description: true,
            userId: true,
            teamId: true,
          },
        },
      },
    });
  }

  findByBookingUidIncludeForm(bookingUid: string) {
    return this.prismaClient.app_RoutingForms_FormResponse.findUnique({
      where: {
        routedToBookingUid: bookingUid,
      },
      include: {
        form: {
          select: {
            fields: true,
          },
        },
      },
    });
  }
}
