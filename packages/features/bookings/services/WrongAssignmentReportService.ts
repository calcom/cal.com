import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { getWebhookProducer } from "@calcom/features/di/webhooks/containers/webhook";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/i18n/server";
import { Prisma } from "@calcom/prisma/client";
import type { WrongAssignmentReportStatus } from "@calcom/prisma/enums";

import { BookingRepository } from "../repositories/BookingRepository";
import { WrongAssignmentReportRepository } from "../repositories/WrongAssignmentReportRepository";

export interface IWrongAssignmentReportServiceDeps {
  bookingRepo: BookingRepository;
  wrongAssignmentReportRepo: WrongAssignmentReportRepository;
  teamRepo: TeamRepository;
}

const log = logger.getSubLogger({ prefix: ["WrongAssignmentReportService"] });

export class WrongAssignmentReportService {
  constructor(private deps: IWrongAssignmentReportServiceDeps) {}

  async report(input: {
    userId: number;
    userEmail: string;
    userName: string | null;
    userLocale: string;
    bookingUid: string;
    correctAssignee?: string;
    additionalNotes: string;
  }) {
    const { bookingRepo, wrongAssignmentReportRepo } = this.deps;
    const t = await getTranslation(input.userLocale, "common");

    const alreadyReported = await wrongAssignmentReportRepo.existsByBookingUid(input.bookingUid);

    if (alreadyReported) {
      throw ErrorWithCode.Factory.BadRequest(t("wrong_assignment_already_reported"));
    }

    const booking = await bookingRepo.findByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason({
      bookingUid: input.bookingUid,
    });

    if (!booking) {
      throw ErrorWithCode.Factory.NotFound("Booking not found");
    }

    const teamId = booking.eventType?.team?.id ?? null;
    const orgId = booking.eventType?.team?.parentId ?? null;
    const routingFormId = booking.routedFromRoutingFormReponse?.formId || null;

    let report: { id: string };
    try {
      report = await wrongAssignmentReportRepo.createReport({
        bookingUid: booking.uid,
        reportedById: input.userId,
        correctAssignee: input.correctAssignee || null,
        additionalNotes: input.additionalNotes,
        teamId,
        routingFormId,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw ErrorWithCode.Factory.BadRequest(t("wrong_assignment_already_reported"));
      }
      throw error;
    }

    await this.sendWebhooks({
      booking,
      teamId,
      orgId,
      wrongAssignmentReportId: report.id,
    });

    return {
      success: true,
      message: t("wrong_assignment_reported"),
      reportId: report.id,
    };
  }

  async listReports(input: {
    teamId: number;
    isAll: boolean;
    statuses: WrongAssignmentReportStatus[];
    routingFormId?: string;
    reportedById?: number;
    limit: number;
    offset: number;
  }) {
    const { wrongAssignmentReportRepo, teamRepo } = this.deps;

    let teamIds: number[];

    if (input.isAll) {
      const childTeams = await teamRepo.findAllByParentId({ parentId: input.teamId, select: { id: true } });
      teamIds = [input.teamId, ...childTeams.map((t) => t.id)];
    } else {
      teamIds = [input.teamId];
    }

    const { reports, totalCount } = await wrongAssignmentReportRepo.findByTeamIdsAndStatuses({
      teamIds,
      statuses: [...input.statuses],
      routingFormId: input.routingFormId,
      reportedById: input.reportedById,
      limit: input.limit,
      offset: input.offset,
    });

    return {
      reports,
      totalCount,
      hasMore: input.offset + reports.length < totalCount,
    };
  }

  private async sendWebhooks(params: {
    booking: NonNullable<
      Awaited<ReturnType<BookingRepository["findByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason"]>>
    >;
    teamId: number | null;
    orgId: number | null;
    wrongAssignmentReportId: string;
  }) {
    const { booking, teamId, orgId } = params;

    try {
      await getWebhookProducer().queueWrongAssignmentReportWebhook({
        bookingUid: booking.uid,
        wrongAssignmentReportId: params.wrongAssignmentReportId,
        userId: booking.userId,
        teamId,
        orgId,
      });
    } catch (error) {
      log.warn("Failed to queue wrong assignment webhook, report was created successfully", {
        bookingUid: booking.uid,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
