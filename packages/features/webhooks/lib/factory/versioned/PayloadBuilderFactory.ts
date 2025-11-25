import { WebhookTriggerEvents, WebhookVersion } from "@calcom/prisma/enums";

import type {
  WebhookEventDTO,
  BookingWebhookEventDTO,
  FormSubmittedDTO,
  FormSubmittedNoEventDTO,
  OOOCreatedDTO,
  RecordingReadyDTO,
  TranscriptionGeneratedDTO,
  MeetingStartedDTO,
  MeetingEndedDTO,
  AfterHostsNoShowDTO,
  AfterGuestsNoShowDTO,
  InstantMeetingDTO,
} from "../../dto/types";
import type { WebhookPayload } from "../types";

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
 * When adding a new webhook version:
 * 1. Add the version to WebhookVersion enum in schema.prisma
 * 2. Create a new directory: versioned/v{VERSION}/
 * 3. Implement version-specific builders in that directory
 * 4. Register the version in this factory
 *
 * @example
 * const factory = new PayloadBuilderFactory();
 * factory.registerVersion(WebhookVersion.V_2024_12_01, {
 *   booking: new BookingPayloadBuilder_2024_12_01(),
 *   form: new FormPayloadBuilder_2024_12_01(),
 *   // ... other builders
 * });
 */
export class PayloadBuilderFactory {
  private builders: Map<WebhookVersion, PayloadBuilderSet>;

  constructor() {
    this.builders = new Map();
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
   */
  getBuilderForVersion(
    version: WebhookVersion,
    triggerEvent: WebhookTriggerEvents
  ): IPayloadBuilder<WebhookEventDTO> {
    const builderSet = this.builders.get(version);

    if (!builderSet) {
      throw new Error(
        `No payload builders registered for webhook version: ${version}. ` +
          `Available versions: ${Array.from(this.builders.keys()).join(", ")}`
      );
    }

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
}
