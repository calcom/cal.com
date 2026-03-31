import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import { WrongAssignmentReportService } from "@calcom/features/bookings/services/WrongAssignmentReportService";
import { getTeamRepository } from "@calcom/features/di/containers/TeamRepository";
import prisma from "@calcom/prisma";
import type { TGetWrongAssignmentReportsInputSchema } from "./getWrongAssignmentReports.schema";
import { statusToEnumMap } from "./getWrongAssignmentReports.schema";

type GetWrongAssignmentReportsOptions = {
  input: TGetWrongAssignmentReportsInputSchema;
};

export const getWrongAssignmentReportsHandler = async ({ input }: GetWrongAssignmentReportsOptions) => {
  const service = new WrongAssignmentReportService({
    bookingRepo: new BookingRepository(prisma),
    wrongAssignmentReportRepo: new WrongAssignmentReportRepository(prisma),
    teamRepo: getTeamRepository(),
  });

  return service.listReports({
    teamId: input.teamId,
    isAll: input.isAll,
    statuses: [...statusToEnumMap[input.status]],
    routingFormId: input.routingFormId ?? undefined,
    reportedById: input.reportedById ?? undefined,
    limit: input.limit,
    offset: input.offset,
  });
};
