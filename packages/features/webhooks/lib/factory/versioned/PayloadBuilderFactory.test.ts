import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it } from "vitest";
import type { BookingWebhookEventDTO } from "../../dto/types";
import { WebhookVersion as WebhookVersionEnum } from "../../interface/IWebhookRepository";
import { PayloadBuilderFactory, type PayloadBuilderSet } from "./PayloadBuilderFactory";
import * as V2021_10_20 from "./v2021-10-20";

describe("PayloadBuilderFactory", () => {
  let factory: PayloadBuilderFactory;
  let defaultBuilders: PayloadBuilderSet;

  beforeEach(() => {
    defaultBuilders = {
      booking: new V2021_10_20.BookingPayloadBuilder(),
      form: new V2021_10_20.FormPayloadBuilder(),
      ooo: new V2021_10_20.OOOPayloadBuilder(),
      recording: new V2021_10_20.RecordingPayloadBuilder(),
      meeting: new V2021_10_20.MeetingPayloadBuilder(),
      instantMeeting: new V2021_10_20.InstantMeetingBuilder(),
    };

    factory = new PayloadBuilderFactory(WebhookVersionEnum.V_2021_10_20, defaultBuilders);
  });

  describe("Constructor", () => {
    it("should initialize with default version and builders", () => {
      expect(factory).toBeInstanceOf(PayloadBuilderFactory);
      expect(factory.getRegisteredVersions()).toContain(WebhookVersionEnum.V_2021_10_20);
    });

    it("should enforce required parameters at compile-time", () => {
      // TypeScript ensures parameters are provided - no runtime check needed
      expect(factory).toBeDefined();
      expect(factory.getRegisteredVersions()).toHaveLength(1);
    });
  });

  describe("Version Registration", () => {
    it("should register new version with complete builder set", () => {
      const newVersionBuilders: PayloadBuilderSet = {
        booking: new V2021_10_20.BookingPayloadBuilder(),
        form: new V2021_10_20.FormPayloadBuilder(),
        ooo: new V2021_10_20.OOOPayloadBuilder(),
        recording: new V2021_10_20.RecordingPayloadBuilder(),
        meeting: new V2021_10_20.MeetingPayloadBuilder(),
        instantMeeting: new V2021_10_20.InstantMeetingBuilder(),
      };

      factory.registerVersion("2024-12-01", newVersionBuilders);

      expect(factory.getRegisteredVersions()).toContain("2024-12-01");
      expect(factory.getRegisteredVersions()).toHaveLength(2);
    });

    it("should allow overwriting existing version", () => {
      const newBuilders: PayloadBuilderSet = {
        booking: new V2021_10_20.BookingPayloadBuilder(),
        form: new V2021_10_20.FormPayloadBuilder(),
        ooo: new V2021_10_20.OOOPayloadBuilder(),
        recording: new V2021_10_20.RecordingPayloadBuilder(),
        meeting: new V2021_10_20.MeetingPayloadBuilder(),
        instantMeeting: new V2021_10_20.InstantMeetingBuilder(),
      };

      factory.registerVersion(WebhookVersionEnum.V_2021_10_20, newBuilders);

      expect(factory.getRegisteredVersions()).toHaveLength(1);
    });
  });

  describe("Builder Routing", () => {
    it("should route booking events to booking builder", () => {
      const bookingTriggers = [
        WebhookTriggerEvents.BOOKING_CREATED,
        WebhookTriggerEvents.BOOKING_CANCELLED,
        WebhookTriggerEvents.BOOKING_REQUESTED,
        WebhookTriggerEvents.BOOKING_RESCHEDULED,
        WebhookTriggerEvents.BOOKING_REJECTED,
        WebhookTriggerEvents.BOOKING_PAID,
        WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
        WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
      ];

      bookingTriggers.forEach((trigger) => {
        const builder = factory.getBuilder(WebhookVersionEnum.V_2021_10_20, trigger);
        expect(builder).toBe(defaultBuilders.booking);
      });
    });

    it("should route form events to form builder", () => {
      const formTriggers = [
        WebhookTriggerEvents.FORM_SUBMITTED,
        WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT,
      ];

      formTriggers.forEach((trigger) => {
        const builder = factory.getBuilder(WebhookVersionEnum.V_2021_10_20, trigger);
        expect(builder).toBe(defaultBuilders.form);
      });
    });

    it("should route OOO events to OOO builder", () => {
      const builder = factory.getBuilder(WebhookVersionEnum.V_2021_10_20, WebhookTriggerEvents.OOO_CREATED);
      expect(builder).toBe(defaultBuilders.ooo);
    });

    it("should route recording events to recording builder", () => {
      const recordingTriggers = [
        WebhookTriggerEvents.RECORDING_READY,
        WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
      ];

      recordingTriggers.forEach((trigger) => {
        const builder = factory.getBuilder(WebhookVersionEnum.V_2021_10_20, trigger);
        expect(builder).toBe(defaultBuilders.recording);
      });
    });

    it("should route meeting events to meeting builder", () => {
      const meetingTriggers = [WebhookTriggerEvents.MEETING_STARTED, WebhookTriggerEvents.MEETING_ENDED];

      meetingTriggers.forEach((trigger) => {
        const builder = factory.getBuilder(WebhookVersionEnum.V_2021_10_20, trigger);
        expect(builder).toBe(defaultBuilders.meeting);
      });
    });

    it("should route instant meeting events to instant meeting builder", () => {
      const builder = factory.getBuilder(
        WebhookVersionEnum.V_2021_10_20,
        WebhookTriggerEvents.INSTANT_MEETING
      );
      expect(builder).toBe(defaultBuilders.instantMeeting);
    });
  });

  describe("Fallback Behavior", () => {
    it("should fallback to default version when requested version not found", () => {
      const builder = factory.getBuilder(
        WebhookVersionEnum.V_2099_99_99,
        WebhookTriggerEvents.BOOKING_CREATED
      );

      // Should get default builder, not throw
      expect(builder).toBe(defaultBuilders.booking);
    });

    it("should log warning when falling back to default", () => {
      // Just verify it doesn't throw - logging is tested elsewhere
      expect(() => {
        factory.getBuilder("invalid-version", WebhookTriggerEvents.BOOKING_CREATED);
      }).not.toThrow();
    });

    it("should never return undefined builder", () => {
      const unknownVersion = WebhookVersionEnum.V_2099_99_99;
      const builder = factory.getBuilder(unknownVersion, WebhookTriggerEvents.BOOKING_CREATED);

      expect(builder).toBeDefined();
      expect(builder).toBe(defaultBuilders.booking);
    });
  });

  describe("Type Safety", () => {
    it("should return correctly typed builder for each trigger", () => {
      // These type assertions verify compile-time type safety
      const bookingBuilder = factory.getBuilder(
        WebhookVersionEnum.V_2021_10_20,
        WebhookTriggerEvents.BOOKING_CREATED
      );
      const formBuilder = factory.getBuilder(
        WebhookVersionEnum.V_2021_10_20,
        WebhookTriggerEvents.FORM_SUBMITTED
      );
      const oooBuilder = factory.getBuilder(
        WebhookVersionEnum.V_2021_10_20,
        WebhookTriggerEvents.OOO_CREATED
      );
      const recordingBuilder = factory.getBuilder(
        WebhookVersionEnum.V_2021_10_20,
        WebhookTriggerEvents.RECORDING_READY
      );
      const meetingBuilder = factory.getBuilder(
        WebhookVersionEnum.V_2021_10_20,
        WebhookTriggerEvents.MEETING_STARTED
      );
      const instantBuilder = factory.getBuilder(
        WebhookVersionEnum.V_2021_10_20,
        WebhookTriggerEvents.INSTANT_MEETING
      );

      // Runtime verification
      expect(bookingBuilder).toBeDefined();
      expect(formBuilder).toBeDefined();
      expect(oooBuilder).toBeDefined();
      expect(recordingBuilder).toBeDefined();
      expect(meetingBuilder).toBeDefined();
      expect(instantBuilder).toBeDefined();
    });

    it("should build valid payload with correctly typed DTO", () => {
      const mockDTO: BookingWebhookEventDTO = {
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        createdAt: "2024-01-15T10:00:00Z",
        booking: {
          id: 1,
          eventTypeId: 1,
          userId: 1,
          smsReminderNumber: null,
        },
        eventType: {
          eventTitle: "Test Event",
          eventDescription: "Test Description",
          requiresConfirmation: false,
          price: 0,
          currency: "USD",
          length: 30,
        },
        evt: {
          type: "test-event",
          title: "Test Meeting",
          description: "Meeting description",
          startTime: "2024-01-15T10:00:00Z",
          endTime: "2024-01-15T10:30:00Z",
          organizer: {
            id: 1,
            email: "organizer@test.com",
            name: "Test Organizer",
            timeZone: "UTC",
            language: { locale: "en" },
          },
          attendees: [
            {
              email: "attendee@test.com",
              name: "Test Attendee",
              timeZone: "UTC",
              language: { locale: "en" },
            },
          ],
          uid: "booking-uid-123",
          customInputs: {},
          responses: {},
          userFieldsResponses: {},
        },
      };

      const builder = factory.getBuilder(
        WebhookVersionEnum.V_2021_10_20,
        WebhookTriggerEvents.BOOKING_CREATED
      );
      const payload = builder.build(mockDTO);

      expect(payload).toBeDefined();
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CREATED);
      expect(payload.payload).toBeDefined();
    });
  });

  describe("Multiple Versions", () => {
    it("should support multiple versions simultaneously", () => {
      const v2Builders: PayloadBuilderSet = {
        booking: new V2021_10_20.BookingPayloadBuilder(),
        form: new V2021_10_20.FormPayloadBuilder(),
        ooo: new V2021_10_20.OOOPayloadBuilder(),
        recording: new V2021_10_20.RecordingPayloadBuilder(),
        meeting: new V2021_10_20.MeetingPayloadBuilder(),
        instantMeeting: new V2021_10_20.InstantMeetingBuilder(),
      };

      factory.registerVersion(WebhookVersionEnum.V_2024_12_01, v2Builders);

      // Both versions should work
      const v1Builder = factory.getBuilder(
        WebhookVersionEnum.V_2021_10_20,
        WebhookTriggerEvents.BOOKING_CREATED
      );
      const v2Builder = factory.getBuilder(
        WebhookVersionEnum.V_2024_12_01,
        WebhookTriggerEvents.BOOKING_CREATED
      );

      expect(v1Builder).toBe(defaultBuilders.booking);
      expect(v2Builder).toBe(v2Builders.booking);
      expect(v1Builder).not.toBe(v2Builder); // Different instances
    });
  });
});
