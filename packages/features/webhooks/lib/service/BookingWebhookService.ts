import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import dayjs from "@calcom/dayjs";

import type {
  BookingCreatedDTO,
  BookingCancelledDTO,
  BookingRequestedDTO,
  BookingRescheduledDTO,
  BookingPaidDTO,
  BookingPaymentInitiatedDTO,
  BookingNoShowDTO,
} from "../dto/types";
import { WebhookNotifier } from "../notifier/WebhookNotifier";

// Simplified interface for webhook trigger args
export interface WebhookTriggerArgs {
  trigger: WebhookTriggerEvents;
  evt: CalendarEvent;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    startTime?: Date;
    smsReminderNumber?: string | null;
  };
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    teamId?: number | null;
  } | null;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
  status?: "ACCEPTED" | "PENDING";
  metadata?: { [key: string]: any };
  platformParams?: {
    platformClientId?: string;
    platformRescheduleUrl?: string;
    platformCancelUrl?: string;
    platformBookingUrl?: string;
  };
  cancelledBy?: string;
  cancellationReason?: string;
  rescheduleId?: number;
  rescheduleUid?: string;
  rescheduleStartTime?: string;
  rescheduleEndTime?: string;
  rescheduledBy?: string;
  paymentId?: number;
  paymentData?: any;
}

/**
 * Service for creating booking-related webhook DTOs and emitting webhook events
 * This is the layer that business logic should interact with
 */
export class BookingWebhookService {
  /**
   * Simplified method to emit booking created webhook from WebhookTriggerArgs
   */
  static async emitBookingCreatedFromArgs(args: WebhookTriggerArgs): Promise<void> {
    return this.emitBookingCreated({
      evt: args.evt,
      booking: {
        ...args.booking,
        startTime: args.booking.startTime || new Date(),
      },
      eventType: args.eventType,
      status: args.status,
      metadata: args.metadata,
      platformParams: args.platformParams,
      teamId: args.teamId,
      orgId: args.orgId,
      isDryRun: args.isDryRun,
    });
  }

  /**
   * Simplified method to emit booking cancelled webhook from WebhookTriggerArgs
   */
  static async emitBookingCancelledFromArgs(args: WebhookTriggerArgs): Promise<void> {
    return this.emitBookingCancelled({
      evt: args.evt,
      booking: args.booking,
      eventType: args.eventType,
      cancelledBy: args.cancelledBy,
      cancellationReason: args.cancellationReason,
      teamId: args.teamId,
      orgId: args.orgId,
      platformClientId: args.platformClientId,
      isDryRun: args.isDryRun,
    });
  }

  /**
   * Simplified method to emit booking requested webhook from WebhookTriggerArgs
   */
  static async emitBookingRequestedFromArgs(args: WebhookTriggerArgs): Promise<void> {
    return this.emitBookingRequested({
      evt: args.evt,
      booking: args.booking,
      eventType: args.eventType,
      teamId: args.teamId,
      orgId: args.orgId,
      platformClientId: args.platformClientId,
      isDryRun: args.isDryRun,
    });
  }

  /**
   * Simplified method to emit booking rescheduled webhook from WebhookTriggerArgs
   */
  static async emitBookingRescheduledFromArgs(args: WebhookTriggerArgs): Promise<void> {
    return this.emitBookingRescheduled({
      evt: args.evt,
      booking: args.booking,
      eventType: args.eventType,
      rescheduleId: args.rescheduleId,
      rescheduleUid: args.rescheduleUid,
      rescheduleStartTime: args.rescheduleStartTime,
      rescheduleEndTime: args.rescheduleEndTime,
      rescheduledBy: args.rescheduledBy,
      teamId: args.teamId,
      orgId: args.orgId,
      platformClientId: args.platformClientId,
      isDryRun: args.isDryRun,
    });
  }

  /**
   * Simplified method to emit booking paid webhook from WebhookTriggerArgs
   */
  static async emitBookingPaidFromArgs(args: WebhookTriggerArgs): Promise<void> {
    return this.emitBookingPaid({
      evt: args.evt,
      booking: args.booking,
      eventType: args.eventType,
      paymentId: args.paymentId,
      paymentData: args.paymentData,
      teamId: args.teamId,
      orgId: args.orgId,
      platformClientId: args.platformClientId,
      isDryRun: args.isDryRun,
    });
  }

  /**
   * Emits a booking payment initiated webhook
   */
  static async emitBookingPaymentInitiated(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    paymentId?: number;
    paymentData?: any;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingPaymentInitiatedDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
      paymentId: params.paymentId,
      paymentData: params.paymentData,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED, dto, params.isDryRun);
  }
  /**
   * Emits a booking created webhook
   */
  static async emitBookingCreated(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
      startTime: Date;
      smsReminderNumber?: string | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    status?: "ACCEPTED" | "PENDING";
    metadata?: { [key: string]: any };
    platformParams?: {
      platformClientId?: string;
      platformRescheduleUrl?: string;
      platformCancelUrl?: string;
      platformBookingUrl?: string;
    };
    teamId?: number | null;
    orgId?: number | null;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingCreatedDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformParams?.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
      status: params.status || "ACCEPTED",
      metadata: params.metadata,
      platformParams: params.platformParams,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_CREATED, dto, params.isDryRun);
  }

  /**
   * Emits a booking cancelled webhook
   */
  static async emitBookingCancelled(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
      smsReminderNumber?: string | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    cancelledBy?: string;
    cancellationReason?: string;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingCancelledDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
      cancelledBy: params.cancelledBy,
      cancellationReason: params.cancellationReason,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_CANCELLED, dto, params.isDryRun);
  }

  /**
   * Emits a booking requested webhook
   */
  static async emitBookingRequested(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingRequestedDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_REQUESTED, dto, params.isDryRun);
  }

  /**
   * Emits a booking rescheduled webhook
   */
  static async emitBookingRescheduled(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
      smsReminderNumber?: string | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    rescheduleId?: number;
    rescheduleUid?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
    rescheduledBy?: string;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingRescheduledDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
      rescheduleId: params.rescheduleId,
      rescheduleUid: params.rescheduleUid,
      rescheduleStartTime: params.rescheduleStartTime,
      rescheduleEndTime: params.rescheduleEndTime,
      rescheduledBy: params.rescheduledBy,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_RESCHEDULED, dto, params.isDryRun);
  }

  /**
   * Emits a booking paid webhook
   */
  static async emitBookingPaid(params: {
    evt: CalendarEvent;
    booking: {
      id: number;
      eventTypeId: number | null;
      userId: number | null;
    };
    eventType: {
      id: number;
      title: string;
      description: string | null;
      requiresConfirmation: boolean;
      price: number;
      currency: string;
      length: number;
      teamId?: number | null;
    } | null;
    paymentId?: number;
    paymentData?: any;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingPaidDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
      createdAt: new Date().toISOString(),
      bookingId: params.booking.id,
      eventTypeId: params.eventType?.id,
      userId: params.booking.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      evt: params.evt,
      eventType: params.eventType,
      booking: params.booking,
      paymentId: params.paymentId,
      paymentData: params.paymentData,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_PAID, dto, params.isDryRun);
  }

  /**
   * Emits a booking no show webhook
   */
  static async emitBookingNoShow(params: {
    message: string;
    bookingUid: string;
    bookingId?: number;
    attendees: { email: string; noShow: boolean }[];
    userId?: number | null;
    eventTypeId?: number | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: BookingNoShowDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
      createdAt: new Date().toISOString(),
      bookingId: params.bookingId,
      eventTypeId: params.eventTypeId,
      userId: params.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      message: params.message,
      bookingUid: params.bookingUid,
      attendees: params.attendees,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED, dto, params.isDryRun);
  }
}
