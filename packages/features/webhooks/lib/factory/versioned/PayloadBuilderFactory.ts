import logger from "@calcom/lib/logger";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookVersion } from "../../interface/IWebhookRepository";

import type {
  AfterGuestsNoShowDTO,
  AfterHostsNoShowDTO,
  BookingWebhookEventDTO,
  DelegationCredentialErrorDTO,
  FormSubmittedDTO,
  FormSubmittedNoEventDTO,
  InstantMeetingDTO,
  MeetingEndedDTO,
  MeetingStartedDTO,
  OOOCreatedDTO,
  RecordingReadyDTO,
  TranscriptionGeneratedDTO,
  WebhookEventDTO,
} from "../../dto/types";
import type { WebhookPayload } from "../types";

const log = logger.getSubLogger({ prefix: ["WebhookPayloadBuilderFactory"] });

/**
 * Generic base interface for all payload builders
 * Ensures type-safe input DTOs and output payloads
 */
export interface IPayloadBuilder<TInput extends WebhookEventDTO = WebhookEventDTO> {
  build(dto: TInput): WebhookPayload;
}

/**
 * Type-safe interfaces for specific payload builders
 */
export interface IBookingPayloadBuilder extends IPayloadBuilder<BookingWebhookEventDTO> {
  build(dto: BookingWebhookEventDTO): WebhookPayload;
}

export interface IFormPayloadBuilder extends IPayloadBuilder<FormSubmittedDTO | FormSubmittedNoEventDTO> {
  build(dto: FormSubmittedDTO | FormSubmittedNoEventDTO): WebhookPayload;
}

export interface IOOOPayloadBuilder extends IPayloadBuilder<OOOCreatedDTO> {
  build(dto: OOOCreatedDTO): WebhookPayload;
}

export interface IRecordingPayloadBuilder
  extends IPayloadBuilder<RecordingReadyDTO | TranscriptionGeneratedDTO> {
  build(dto: RecordingReadyDTO | TranscriptionGeneratedDTO): WebhookPayload;
}

export interface IMeetingPayloadBuilder
  extends IPayloadBuilder<MeetingStartedDTO | MeetingEndedDTO | AfterHostsNoShowDTO | AfterGuestsNoShowDTO> {
  build(
    dto: MeetingStartedDTO | MeetingEndedDTO | AfterHostsNoShowDTO | AfterGuestsNoShowDTO
  ): WebhookPayload;
}

export interface IInstantMeetingBuilder extends IPayloadBuilder<InstantMeetingDTO> {
  build(dto: InstantMeetingDTO): WebhookPayload;
}

export interface IDelegationPayloadBuilder extends IPayloadBuilder<DelegationCredentialErrorDTO> {
  build(dto: DelegationCredentialErrorDTO): WebhookPayload;
}

/**
 * Set of all payload builders for a specific webhook version
 * Each builder is properly typed for its respective event DTOs
 */
export interface PayloadBuilderSet {
  booking: IBookingPayloadBuilder;
  form: IFormPayloadBuilder;
  ooo: IOOOPayloadBuilder;
  recording: IRecordingPayloadBuilder;
  meeting: IMeetingPayloadBuilder;
  instantMeeting: IInstantMeetingBuilder;
  delegation: IDelegationPayloadBuilder;
}

/**
 * Builder categories - used for explicit routing
 */
type BuilderCategory = keyof PayloadBuilderSet;

/**
 * Explicit mapping of trigger events to builder categories.
 * This prevents ambiguous routing - each event has exactly one handler.
 *
 * Note: Record<WebhookTriggerEvents, BuilderCategory> ensures all events are mapped.
 */
const TRIGGER_TO_BUILDER_CATEGORY: Record<WebhookTriggerEvents, BuilderCategory> = {
  // Booking events
  [WebhookTriggerEvents.BOOKING_CREATED]: "booking",
  [WebhookTriggerEvents.BOOKING_RESCHEDULED]: "booking",
  [WebhookTriggerEvents.BOOKING_CANCELLED]: "booking",
  [WebhookTriggerEvents.BOOKING_REJECTED]: "booking",
  [WebhookTriggerEvents.BOOKING_REQUESTED]: "booking",
  [WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED]: "booking",
  [WebhookTriggerEvents.BOOKING_PAID]: "booking",
  [WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED]: "booking",

  // Form events
  [WebhookTriggerEvents.FORM_SUBMITTED]: "form",
  [WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT]: "form",

  // OOO events
  [WebhookTriggerEvents.OOO_CREATED]: "ooo",

  // Recording events
  [WebhookTriggerEvents.RECORDING_READY]: "recording",
  [WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED]: "recording",

  // Meeting events
  [WebhookTriggerEvents.MEETING_STARTED]: "meeting",
  [WebhookTriggerEvents.MEETING_ENDED]: "meeting",
  [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW]: "meeting",
  [WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW]: "meeting",

  // Instant meeting events
  [WebhookTriggerEvents.INSTANT_MEETING]: "instantMeeting",

  // Delegation events
  [WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR]: "delegation",
};

/**
 * Type mapping: TriggerEvent → DTO type
 * Used for compile-time type safety
 *
 * Note: WebhookTriggerEvents is a const object, so we use typeof to extract literal types
 */
type BookingTriggerEvents =
  | typeof WebhookTriggerEvents.BOOKING_CREATED
  | typeof WebhookTriggerEvents.BOOKING_RESCHEDULED
  | typeof WebhookTriggerEvents.BOOKING_CANCELLED
  | typeof WebhookTriggerEvents.BOOKING_REJECTED
  | typeof WebhookTriggerEvents.BOOKING_REQUESTED
  | typeof WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED
  | typeof WebhookTriggerEvents.BOOKING_PAID
  | typeof WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED;

type DelegationTriggerEvents = typeof WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR;

type FormTriggerEvents =
  | typeof WebhookTriggerEvents.FORM_SUBMITTED
  | typeof WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT;

type OOOTriggerEvents = typeof WebhookTriggerEvents.OOO_CREATED;

type RecordingTriggerEvents =
  | typeof WebhookTriggerEvents.RECORDING_READY
  | typeof WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED;

type MeetingTriggerEvents =
  | typeof WebhookTriggerEvents.MEETING_STARTED
  | typeof WebhookTriggerEvents.MEETING_ENDED
  | typeof WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW
  | typeof WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW;

type InstantMeetingTriggerEvents = typeof WebhookTriggerEvents.INSTANT_MEETING;

/**
 * Factory that routes to version-specific payload builders
 *
 * Uses explicit trigger→builder mapping for:
 * - No ambiguous routing (each event has exactly one handler)
 * - Compile-time validation (all events must be mapped)
 * - Type-safe builder selection via overloads
 *
 * @example
 * ```ts
 * const factory = createPayloadBuilderFactory();
 * const builder = factory.getBuilder(version, WebhookTriggerEvents.BOOKING_CREATED);
 * const payload = builder.build(bookingDTO); // Type-safe: expects BookingWebhookEventDTO
 * ```
 */
export class PayloadBuilderFactory {
  private builders: Map<WebhookVersion, PayloadBuilderSet>;
  private readonly defaultBuilderSet: PayloadBuilderSet;
  private readonly defaultVersion: WebhookVersion;

  /**
   * @param defaultVersion - The version to use as fallback when requested version is not registered
   * @param defaultBuilderSet - Required builders for the default version. Guarantees fallback always works.
   */
  constructor(defaultVersion: WebhookVersion, defaultBuilderSet: PayloadBuilderSet) {
    this.defaultVersion = defaultVersion;
    this.defaultBuilderSet = defaultBuilderSet;
    this.builders = new Map();
    this.builders.set(defaultVersion, defaultBuilderSet);
  }

  /**
   * Register a complete set of payload builders for a specific version
   */
  registerVersion(version: WebhookVersion, builderSet: PayloadBuilderSet): void {
    this.builders.set(version, builderSet);
  }

  /**
   * Get the builder set for a version, falling back to default if not registered
   */
  private getBuilderSet(version: WebhookVersion): PayloadBuilderSet {
    const requestedBuilderSet = this.builders.get(version);

    if (!requestedBuilderSet) {
      log.warn(
        `Webhook version "${version}" not registered, falling back to default version "${this.defaultVersion}". ` +
          `Available versions: ${Array.from(this.builders.keys()).join(", ")}`
      );
      return this.defaultBuilderSet;
    }

    return requestedBuilderSet;
  }

  /**
   * Type-safe builder getters - overloaded for compile-time DTO type safety
   */
  getBuilder(version: WebhookVersion, triggerEvent: BookingTriggerEvents): IBookingPayloadBuilder;
  getBuilder(version: WebhookVersion, triggerEvent: FormTriggerEvents): IFormPayloadBuilder;
  getBuilder(version: WebhookVersion, triggerEvent: OOOTriggerEvents): IOOOPayloadBuilder;
  getBuilder(version: WebhookVersion, triggerEvent: RecordingTriggerEvents): IRecordingPayloadBuilder;
  getBuilder(version: WebhookVersion, triggerEvent: MeetingTriggerEvents): IMeetingPayloadBuilder;
  getBuilder(version: WebhookVersion, triggerEvent: InstantMeetingTriggerEvents): IInstantMeetingBuilder;
  getBuilder(version: WebhookVersion, triggerEvent: DelegationTriggerEvents): IDelegationPayloadBuilder;
  getBuilder(version: WebhookVersion, triggerEvent: WebhookTriggerEvents): IPayloadBuilder<WebhookEventDTO>;
  getBuilder(version: WebhookVersion, triggerEvent: WebhookTriggerEvents): IPayloadBuilder<WebhookEventDTO> {
    const builderSet = this.getBuilderSet(version);
    const category = TRIGGER_TO_BUILDER_CATEGORY[triggerEvent];

    return builderSet[category];
  }

  /**
   * Get all registered versions
   */
  getRegisteredVersions(): WebhookVersion[] {
    return Array.from(this.builders.keys());
  }

  /**
   * Check if a version is supported
   */
  isVersionSupported(version: WebhookVersion): boolean {
    return this.builders.has(version);
  }

  /**
   * Get the default/fallback version
   */
  getDefaultVersion(): WebhookVersion {
    return this.defaultVersion;
  }
}
