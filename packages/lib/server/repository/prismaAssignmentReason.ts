import prisma from "@calcom/prisma";

export class AssignmentReasonRepository {
  static async findLatestReasonFromBookingUid(bookingUid: string) {
    return await prisma.assignmentReason.findFirst({
      where: {
        booking: {
          uid: bookingUid,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
