import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { Prisma } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
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
      reporter: { id: input.userId, email: input.userEmail, name: input.userName },
      correctAssignee: input.correctAssignee || null,
      additionalNotes: input.additionalNotes || null,
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
    reporter: { id: number; email: string; name: string | null };
    correctAssignee: string | null;
    additionalNotes: string | null;
  }) {
    const { booking, teamId, orgId, reporter } = params;

    const webhookPayload = {
      booking: {
        uid: booking.uid,
        id: booking.id,
        title: booking.title,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        eventType: booking.eventType
          ? {
              id: booking.eventType.id,
              title: booking.eventType.title,
              slug: booking.eventType.slug,
              teamId: teamId,
            }
          : null,
      },
      report: {
        reportedBy: reporter,
        firstAssignmentReason: booking.assignmentReason[0]?.reasonString ?? null,
        guest: booking.attendees[0]?.email ?? null,
        host: {
          email: booking.user?.email ?? null,
          name: booking.user?.name ?? null,
        },
        correctAssignee: params.correctAssignee,
        additionalNotes: params.additionalNotes,
      },
    };

    try {
      const webhooks = await getWebhooks({
        userId: booking.userId,
        teamId,
        orgId,
        triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
      });

      const webhookPromises = webhooks.map((webhook) =>
        sendGenericWebhookPayload({
          secretKey: webhook.secret,
          triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
          createdAt: new Date().toISOString(),
          webhook,
          data: webhookPayload,
        }).catch((error) => {
          log.error(`Failed to send webhook to ${webhook.subscriberUrl}:`, error);
          return { ok: false, status: 0 };
        })
      );

      await Promise.allSettled(webhookPromises);

      log.info(`Wrong assignment report webhooks sent for booking ${booking.uid}`, {
        teamId,
        userId: booking.userId,
        webhookCount: webhooks.length,
      });
    } catch (error) {
      log.error("Failed to send wrong assignment webhooks:", error);
    }
  }
}
