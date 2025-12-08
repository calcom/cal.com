import logger from "@calcom/lib/logger";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookVersion } from "../../interface/IWebhookRepository";

import type {
  AfterGuestsNoShowDTO,
  AfterHostsNoShowDTO,
  BookingWebhookEventDTO,
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
  canHandle(triggerEvent: WebhookTriggerEvents): boolean;
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
}

/**
 * Factory that routes to version-specific payload builders
 *
 * The factory requires a default builder set to guarantee fallback always works.
 * Use `createPayloadBuilderFactory()` from registry.ts to get a properly configured instance.
 *
 * When adding a new webhook version:
 * 1. Add the version to WebhookVersion enum in schema.prisma
 * 2. Create a new directory: versioned/v{VERSION}/
 * 3. Implement version-specific builders in that directory
 * 4. Register the version in registry.ts
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
   * Get the appropriate payload builder for a given version and event type
   * Returns a type-safe builder that accepts the correct DTO type
   *
   * If the requested version is not registered, falls back to the default version
   * with a warning log to avoid breaking external consumers due to misconfiguration.
   */
  getBuilderForVersion(
    version: WebhookVersion,
    triggerEvent: WebhookTriggerEvents
  ): IPayloadBuilder<WebhookEventDTO> {
    const requestedBuilderSet = this.builders.get(version);

    // Fall back to default version if requested version is not registered
    if (!requestedBuilderSet) {
      log.warn(
        `Webhook version "${version}" not registered, falling back to default version "${this.defaultVersion}". ` +
          `Available versions: ${Array.from(this.builders.keys()).join(", ")}`
      );
    }

    // Use requested version or fall back to default (guaranteed by constructor)
    const builderSet = requestedBuilderSet ?? this.defaultBuilderSet;

    // Route to appropriate builder by checking each builder's canHandle method
    // This uses the builder's own logic to determine if it can handle the event
    const builders: IPayloadBuilder<WebhookEventDTO>[] = [
      builderSet.booking,
      builderSet.form,
      builderSet.ooo,
      builderSet.recording,
      builderSet.meeting,
      builderSet.instantMeeting,
    ];

    for (const builder of builders) {
      if (builder.canHandle(triggerEvent)) {
        return builder;
      }
    }

    throw new Error(`No builder found for trigger event: ${triggerEvent}`);
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
