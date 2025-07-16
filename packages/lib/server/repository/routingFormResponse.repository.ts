import prisma from "@calcom/prisma";

export class RoutingFormResponseRepository {
  static findByIdIncludeForm(id: number) {
    return prisma.app_RoutingForms_FormResponse.findUnique({
      where: {
        id,
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

  static findByBookingUidIncludeForm(bookingUid: string) {
    return prisma.app_RoutingForms_FormResponse.findUnique({
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
