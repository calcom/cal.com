import type { DisplayField, TranslationWithParams } from "../actions/IAuditActionService";
import type { AuditActorType } from "../repository/IAuditActorRepository";
import type {
  BookingActivityCategory,
  BookingActivityEventKind,
} from "../types/activityTimeline";
import { getActivityCategoryForAuditAction } from "../types/activityTimeline";
import type { DisplayBookingAuditLog } from "./BookingAuditViewerService";
import type {
  BookingActivityIntegrationRecord,
  BookingActivityPaymentRecord,
  BookingActivityReminderRecord,
  BookingActivitySupplementaryData,
} from "./BookingActivitySupplementaryDataFetcher";

export type DisplayBookingActivityLog = DisplayBookingAuditLog & {
  category: BookingActivityCategory;
  eventKind: BookingActivityEventKind;
};

const SYSTEM_ACTOR = {
  id: "system-activity-timeline",
  type: "SYSTEM" as AuditActorType,
  userUuid: null,
  attendeeId: null,
  name: "System",
  createdAt: new Date(0),
  displayName: "System",
  displayEmail: null,
  displayAvatar: null,
};

function formatReminderElapsedMinutes(elapsedMinutes: number): string {
  if (elapsedMinutes >= 24 * 60) {
    const days = Math.round(elapsedMinutes / (24 * 60));
    return `${days}d`;
  }
  if (elapsedMinutes >= 60) {
    const hours = Math.round(elapsedMinutes / 60);
    return `${hours}h`;
  }
  return `${elapsedMinutes}m`;
}

function buildReminderActivityLog(reminder: BookingActivityReminderRecord): DisplayBookingActivityLog {
  const displayFields: DisplayField[] = [
    {
      labelKey: "booking_activity.reminder_type",
      fieldValue: { type: "translationKey", valueKey: "booking_activity.reminder_pending_confirmation" },
    },
    {
      labelKey: "booking_activity.reminder_interval",
      fieldValue: {
        type: "rawValue",
        value: formatReminderElapsedMinutes(reminder.elapsedMinutes),
      },
    },
  ];

  return {
    id: `reminder-${reminder.id}`,
    bookingUid: "",
    type: "RECORD_CREATED",
    action: "REMINDER_SENT",
    timestamp: reminder.createdAt.toISOString(),
    createdAt: reminder.createdAt.toISOString(),
    source: "SYSTEM",
    operationId: `reminder-${reminder.id}`,
    actionDisplayTitle: {
      key: "booking_activity.reminder_sent",
      params: { interval: formatReminderElapsedMinutes(reminder.elapsedMinutes) },
    },
    displayFields,
    actor: SYSTEM_ACTOR,
    category: "reminder",
    eventKind: "reminder",
  };
}

function buildIntegrationActivityLog(integration: BookingActivityIntegrationRecord): DisplayBookingActivityLog {
  const displayFields: DisplayField[] = [
    {
      labelKey: "booking_activity.integration_type",
      fieldValue: { type: "rawValue", value: integration.type },
    },
    {
      labelKey: "booking_activity.integration_uid",
      fieldValue: { type: "rawValue", value: integration.uid },
    },
  ];

  if (integration.meetingUrl) {
    displayFields.push({
      labelKey: "booking_activity.meeting_url",
      fieldValue: { type: "rawValue", value: integration.meetingUrl },
    });
  }

  if (integration.meetingId) {
    displayFields.push({
      labelKey: "booking_activity.meeting_id",
      fieldValue: { type: "rawValue", value: integration.meetingId },
    });
  }

  if (integration.externalCalendarId) {
    displayFields.push({
      labelKey: "booking_activity.external_calendar_id",
      fieldValue: { type: "rawValue", value: integration.externalCalendarId },
    });
  }

  displayFields.push({
    labelKey: "booking_activity.integration_status",
    fieldValue: {
      type: "translationKey",
      valueKey: integration.deleted ? "booking_activity.integration_removed" : "booking_activity.integration_active",
    },
  });

  return {
    id: `integration-${integration.id}`,
    bookingUid: "",
    type: integration.deleted ? "RECORD_DELETED" : "RECORD_CREATED",
    action: integration.deleted ? "INTEGRATION_REMOVED" : "INTEGRATION_LINKED",
    timestamp: new Date(0).toISOString(),
    createdAt: new Date(0).toISOString(),
    source: "SYSTEM",
    operationId: `integration-${integration.id}`,
    actionDisplayTitle: {
      key: integration.deleted
        ? "booking_activity.integration_removed_title"
        : "booking_activity.integration_linked_title",
      params: { integrationType: integration.type },
    },
    displayFields,
    displayJson: {
      type: integration.type,
      uid: integration.uid,
      meetingUrl: integration.meetingUrl,
      meetingId: integration.meetingId,
      externalCalendarId: integration.externalCalendarId,
      deleted: integration.deleted,
    },
    actor: SYSTEM_ACTOR,
    category: "integration",
    eventKind: "integration",
  };
}

function buildPaymentActivityLog(payment: BookingActivityPaymentRecord): DisplayBookingActivityLog {
  const displayFields: DisplayField[] = [
    {
      labelKey: "booking_activity.payment_amount",
      fieldValue: {
        type: "rawValue",
        value: `${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`,
      },
    },
    {
      labelKey: "booking_activity.payment_status",
      fieldValue: {
        type: "translationKey",
        valueKey: payment.success
          ? payment.refunded
            ? "booking_activity.payment_refunded"
            : "booking_activity.payment_successful"
          : "booking_activity.payment_failed",
      },
    },
  ];

  if (payment.appId) {
    displayFields.push({
      labelKey: "booking_activity.payment_provider",
      fieldValue: { type: "rawValue", value: payment.appId },
    });
  }

  displayFields.push({
    labelKey: "booking_activity.payment_external_id",
    fieldValue: { type: "rawValue", value: payment.externalId },
  });

  return {
    id: `payment-${payment.id}`,
    bookingUid: "",
    type: "RECORD_CREATED",
    action: payment.success ? "PAYMENT_RECEIVED" : "PAYMENT_FAILED",
    timestamp: new Date(0).toISOString(),
    createdAt: new Date(0).toISOString(),
    source: "WEBHOOK",
    operationId: `payment-${payment.id}`,
    actionDisplayTitle: {
      key: payment.success
        ? payment.refunded
          ? "booking_activity.payment_refunded_title"
          : "booking_activity.payment_received_title"
        : "booking_activity.payment_failed_title",
      params: { provider: payment.appId ?? "unknown" },
    },
    displayFields,
    displayJson: {
      uid: payment.uid,
      externalId: payment.externalId,
      success: payment.success,
      refunded: payment.refunded,
      paymentOption: payment.paymentOption,
    },
    actor: SYSTEM_ACTOR,
    category: "integration",
    eventKind: "payment",
  };
}

function buildSyntheticCreationLog(data: BookingActivitySupplementaryData): DisplayBookingActivityLog {
  const displayFields: DisplayField[] = [
    {
      labelKey: "booking_activity.booking_status",
      fieldValue: { type: "rawValue", value: data.status },
    },
  ];

  if (data.creationSource) {
    displayFields.push({
      labelKey: "booking_audit_action.source",
      fieldValue: { type: "rawValue", value: data.creationSource },
    });
  }

  return {
    id: `synthetic-created-${data.bookingId}`,
    bookingUid: data.bookingUid,
    type: "RECORD_CREATED",
    action: "CREATED",
    timestamp: data.createdAt.toISOString(),
    createdAt: data.createdAt.toISOString(),
    source: data.creationSource ?? "UNKNOWN",
    operationId: `synthetic-created-${data.bookingId}`,
    actionDisplayTitle: { key: "booking_activity.synthetic_created" },
    displayFields,
    actor: SYSTEM_ACTOR,
    category: "creation",
    eventKind: "synthetic",
  };
}

function enrichAuditLogWithActivityMetadata(log: DisplayBookingAuditLog): DisplayBookingActivityLog {
  return {
    ...log,
    category: getActivityCategoryForAuditAction(log.action),
    eventKind: "audit",
  };
}

function stampBookingUid(logs: DisplayBookingActivityLog[], bookingUid: string): DisplayBookingActivityLog[] {
  return logs.map((log) => ({
    ...log,
    bookingUid: log.bookingUid || bookingUid,
  }));
}

function stampIntegrationTimestamps(
  logs: DisplayBookingActivityLog[],
  fallbackTimestamp: string
): DisplayBookingActivityLog[] {
  return logs.map((log) => {
    if (log.eventKind !== "integration" && log.eventKind !== "payment") {
      return log;
    }

    if (log.timestamp !== new Date(0).toISOString()) {
      return log;
    }

    return {
      ...log,
      timestamp: fallbackTimestamp,
      createdAt: fallbackTimestamp,
    };
  });
}

export class BookingActivityTimelineBuilder {
  build(params: {
    auditLogs: DisplayBookingAuditLog[];
    supplementaryData: BookingActivitySupplementaryData | null;
  }): DisplayBookingActivityLog[] {
    const { auditLogs, supplementaryData } = params;

    const enrichedAuditLogs = auditLogs.map(enrichAuditLogWithActivityMetadata);
    const supplementaryLogs: DisplayBookingActivityLog[] = [];

    if (supplementaryData) {
      if (!supplementaryData.hasCreatedAuditLog) {
        supplementaryLogs.push(buildSyntheticCreationLog(supplementaryData));
      }

      supplementaryLogs.push(
        ...supplementaryData.reminders.map(buildReminderActivityLog),
        ...supplementaryData.integrations.map(buildIntegrationActivityLog),
        ...supplementaryData.payments.map(buildPaymentActivityLog)
      );
    }

    const mergedLogs = stampIntegrationTimestamps(
      stampBookingUid([...enrichedAuditLogs, ...supplementaryLogs], supplementaryData?.bookingUid ?? ""),
      supplementaryData?.createdAt.toISOString() ?? new Date().toISOString()
    );

    return mergedLogs.sort((a, b) => {
      const timestampA = new Date(a.timestamp).getTime();
      const timestampB = new Date(b.timestamp).getTime();
      return timestampB - timestampA;
    });
  }
}
