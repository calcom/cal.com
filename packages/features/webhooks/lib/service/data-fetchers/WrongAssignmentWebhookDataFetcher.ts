import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { WrongAssignmentWebhookTaskPayload } from "../../types/webhookTask";

export class WrongAssignmentWebhookDataFetcher implements IWebhookDataFetcher {
  constructor(
    private readonly logger: ILogger,
    private readonly bookingRepository: BookingRepository,
    private readonly userRepository: UserRepository,
    private readonly wrongAssignmentReportRepository: WrongAssignmentReportRepository
  ) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return triggerEvent === WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT;
  }

  async fetchEventData(payload: WrongAssignmentWebhookTaskPayload): Promise<Record<string, unknown> | null> {
    const { wrongAssignmentReportId } = payload;

    try {
      const [report, booking] = await Promise.all([
        this.wrongAssignmentReportRepository.findById(wrongAssignmentReportId),
        this.bookingRepository.findByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason({
          bookingUid: payload.bookingUid,
        }),
      ]);

      if (!report) {
        this.logger.warn("Wrong assignment report not found for webhook", {
          wrongAssignmentReportId,
          bookingUid: payload.bookingUid,
        });
        return null;
      }

      if (!booking) {
        this.logger.warn("Booking not found for wrong assignment webhook", {
          bookingUid: payload.bookingUid,
        });
        return null;
      }

      const reporter = report.reportedById
        ? await this.userRepository.findEmailAndNameById({ id: report.reportedById })
        : null;

      const teamId = booking.eventType?.team?.id ?? null;

      return {
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
                teamId,
              }
            : null,
        },
        report: {
          reportedBy: {
            id: report.reportedById ?? 0,
            email: reporter?.email ?? "",
            name: reporter?.name ?? null,
          },
          firstAssignmentReason: booking.assignmentReason[0]?.reasonString ?? null,
          guest: booking.attendees[0]?.email ?? null,
          host: {
            email: booking.user?.email ?? null,
            name: booking.user?.name ?? null,
          },
          correctAssignee: report.correctAssignee,
          additionalNotes: report.additionalNotes,
        },
      };
    } catch (error) {
      this.logger.error("Error fetching wrong assignment data for webhook", {
        bookingUid: payload.bookingUid,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  getSubscriberContext(payload: WrongAssignmentWebhookTaskPayload): SubscriberContext {
    return {
      triggerEvent: payload.triggerEvent,
      userId: payload.userId ?? undefined,
      eventTypeId: undefined,
      teamId: payload.teamId,
      orgId: payload.orgId ?? undefined,
      oAuthClientId: undefined,
    };
  }
}
