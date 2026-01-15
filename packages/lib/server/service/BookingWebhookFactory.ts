import type { Person } from "@calcom/types/Calendar";
import type { JsonValue } from "@calcom/types/JsonObject";

function isObjectButNotArray(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && !Array.isArray(obj);
}

type DestinationCalendar = {
  id: number;
  integration: string;
  externalId: string;
  primaryEmail: string | null;
  userId: number | null;
  eventTypeId: number | null;
  credentialId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  delegationCredentialId: string | null;
  domainWideDelegationCredentialId: string | null;
  customCalendarReminder: number | null;
};

type Response = {
  label: string;
  value: string | boolean | string[] | { value: string; optionValue: string } | Record<string, string>;
  isHidden?: boolean | undefined;
};

interface BaseWebhookPayload {
  bookingId: number;
  title: string;
  eventSlug: string | null;
  description: string | null;
  customInputs: JsonValue | null;
  responses: Record<string, Response>;
  userFieldsResponses: Record<string, Response>;
  startTime: string;
  endTime: string;
  organizer: Person;
  attendees: Person[];
  uid: string;
  location: string | null;
  destinationCalendar: DestinationCalendar | null;
  cancellationReason: string | null;
  iCalUID: string | null;
  smsReminderNumber?: string;
  cancelledBy: string | null;
}

interface CancelledEventPayload extends BaseWebhookPayload {
  cancelledBy: string;
  cancellationReason: string;
  eventTypeId?: number | null;
  length?: number | null;
  iCalSequence?: number | null;
  eventTitle?: string | null;
  requestReschedule?: boolean;
}

export class BookingWebhookFactory {
  private getType(params: BaseWebhookPayload) {
    return params.eventSlug || params.title || "";
  }

  private getTitle(params: BaseWebhookPayload) {
    return params.title || "";
  }

  private getDestinationCalendar(params: BaseWebhookPayload) {
    return params.destinationCalendar ? [params.destinationCalendar] : [];
  }

  private getCustomInputs(params: BaseWebhookPayload) {
    return isObjectButNotArray(params.customInputs) ? params.customInputs : undefined;
  }

  /**
   * Creates base webhook payload with common fields
   */
  private createBasePayload(params: BaseWebhookPayload) {
    const {
      bookingId,
      title,
      eventSlug,
      description,
      customInputs,
      startTime,
      endTime,
      uid,
      location,
      organizer,
      attendees,
      responses,
      userFieldsResponses,
      destinationCalendar,
      smsReminderNumber,
      iCalUID,
    } = params;

    const basePayload = {
      bookingId,
      type: this.getType(params),
      title: this.getTitle(params),
      description,
      customInputs: this.getCustomInputs(params),
      responses,
      userFieldsResponses,
      startTime,
      endTime,
      organizer,
      attendees,
      uid,
      location,
      destinationCalendar: this.getDestinationCalendar(params),
      iCalUID,
      smsReminderNumber,
    };

    return basePayload;
  }

  public createCancelledEventPayload(params: CancelledEventPayload) {
    const basePayload = this.createBasePayload({
      ...params,
    });

    return {
      ...basePayload,
      cancelledBy: params.cancelledBy,
      cancellationReason: params.cancellationReason,
      status: "CANCELLED" as const,
      eventTypeId: params.eventTypeId ?? null,
      length: params.length ?? null,
      iCalSequence: params.iCalSequence ?? null,
      eventTitle: params.eventTitle ?? null,
      requestReschedule: params.requestReschedule ?? false,
    };
  }
}
