import prisma from "@calcom/prisma";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";

export default class AssignmentReasonRecorder {
  static async roundRobinReassignment({
    bookingId,
    reassignById,
    reassignReason,
  }: {
    bookingId: number;
    reassignById: number;
    reassignReason?: string;
  }) {
    const reassignedBy = await prisma.user.findFirst({
      where: {
        id: reassignById,
      },
      select: {
        username: true,
      },
    });

    const reasonString = `Reassigned by: ${reassignedBy?.username || "team member"}. ${
      reassignReason ? `Reason: ${reassignReason}` : ""
    }`;

    await prisma.assignmentReason.create({
      data: {
        bookingId: bookingId,
        reasonEnum: AssignmentReasonEnum.REASSIGNED,
        reasonString,
      },
    });
  }
}
