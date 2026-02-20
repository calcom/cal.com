import { getAllWorkflowsFromEventType } from "@calcom/ee/workflows/lib/getAllWorkflowsFromEventType";
import type { ExtendedCalendarEvent } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import { WorkflowService } from "@calcom/ee/workflows/lib/service/WorkflowService";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getHideBranding } from "@calcom/features/profile/lib/hideBranding";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["RecordingWorkflowService"] });

type BookingForWorkflow = {
  id: number;
  uid: string;
  eventTypeId: number | null;
  eventType?: {
    id: number;
    teamId?: number | null;
    parentId?: number | null;
    workflows?: { workflow: { id: number } }[];
    owner?: { hideBranding?: boolean } | null;
  } | null;
  user?: {
    id: number | null;
  } | null;
  teamId?: number | null;
};

type TranscriptionData = {
  format: string;
  link: string;
}[];

export class RecordingWorkflowService {
  static async triggerRecordingReadyWorkflows({
    booking,
    downloadLink,
    calendarEvent,
    teamId,
    orgId,
  }: {
    booking: BookingForWorkflow;
    downloadLink: string;
    calendarEvent: ExtendedCalendarEvent;
    teamId?: number | null;
    orgId?: number | null;
  }): Promise<void> {
    try {
      if (!booking.eventTypeId) {
        log.debug("No eventTypeId for booking, skipping recording workflows", {
          bookingUid: booking.uid,
        });
        return;
      }

      const workflows = await getAllWorkflowsFromEventType(booking.eventType, booking.user?.id);

      if (!workflows || workflows.length === 0) {
        log.debug("No workflows found for event type", {
          eventTypeId: booking.eventTypeId,
          bookingUid: booking.uid,
        });
        return;
      }

      const hideBranding = await getHideBranding({
        teamId: teamId ?? undefined,
      });

      const creditService = new CreditService();

      await WorkflowService.scheduleRecordingWorkflows({
        workflows,
        triggers: [WorkflowTriggerEvents.RECORDING_READY],
        recordingData: {
          recordingUrl: downloadLink,
        },
        calendarEvent,
        hideBranding,
        smsReminderNumber: null,
        creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
      });

      log.debug("Recording ready workflows triggered", {
        bookingUid: booking.uid,
        workflowCount: workflows.length,
      });
    } catch (error) {
      log.error("Error triggering recording ready workflows", error);
    }
  }

  static async triggerTranscriptionWorkflows({
    booking,
    downloadLinks,
    calendarEvent,
    teamId,
    orgId,
  }: {
    booking: BookingForWorkflow;
    downloadLinks?: {
      transcription?: TranscriptionData;
      recording?: string;
    };
    calendarEvent: ExtendedCalendarEvent;
    teamId?: number | null;
    orgId?: number | null;
  }): Promise<void> {
    try {
      if (!booking.eventTypeId) {
        log.debug("No eventTypeId for booking, skipping transcription workflows", {
          bookingUid: booking.uid,
        });
        return;
      }

      const workflows = await getAllWorkflowsFromEventType(booking.eventType, booking.user?.id);

      if (!workflows || workflows.length === 0) {
        log.debug("No workflows found for event type", {
          eventTypeId: booking.eventTypeId,
          bookingUid: booking.uid,
        });
        return;
      }

      const hideBranding = await getHideBranding({
        teamId: teamId ?? undefined,
      });

      const transcriptionUrl = downloadLinks?.transcription?.map((t) => `${t.format}: ${t.link}`).join(", ");

      const creditService = new CreditService();

      await WorkflowService.scheduleRecordingWorkflows({
        workflows,
        triggers: [WorkflowTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED],
        recordingData: {
          recordingUrl: downloadLinks?.recording,
          transcriptionUrl,
        },
        calendarEvent,
        hideBranding,
        smsReminderNumber: null,
        creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
      });

      log.debug("Transcription workflows triggered", {
        bookingUid: booking.uid,
        workflowCount: workflows.length,
      });
    } catch (error) {
      log.error("Error triggering transcription workflows", error);
    }
  }
}
