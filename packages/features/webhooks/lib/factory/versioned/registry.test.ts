import { describe, it, expect } from "vitest";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { DEFAULT_WEBHOOK_VERSION } from "../../interface/IWebhookRepository";
import { createPayloadBuilderFactory } from "./registry";
import * as V2021_10_20 from "./v2021-10-20";

describe("Payload Builder Registry", () => {
  describe("createPayloadBuilderFactory", () => {
    it("should create factory with default version registered", () => {
      const factory = createPayloadBuilderFactory();

      expect(factory).toBeDefined();
      expect(factory.getRegisteredVersions()).toContain(DEFAULT_WEBHOOK_VERSION);
    });

    it("should register all required builders for default version", () => {
      const factory = createPayloadBuilderFactory();

      // Test each builder category by trigger event
      const bookingBuilder = factory.getBuilder(DEFAULT_WEBHOOK_VERSION, WebhookTriggerEvents.BOOKING_CREATED);
      const formBuilder = factory.getBuilder(DEFAULT_WEBHOOK_VERSION, WebhookTriggerEvents.FORM_SUBMITTED);
      const oooBuilder = factory.getBuilder(DEFAULT_WEBHOOK_VERSION, WebhookTriggerEvents.OOO_CREATED);
      const recordingBuilder = factory.getBuilder(DEFAULT_WEBHOOK_VERSION, WebhookTriggerEvents.RECORDING_READY);
      const meetingBuilder = factory.getBuilder(DEFAULT_WEBHOOK_VERSION, WebhookTriggerEvents.MEETING_STARTED);
      const instantBuilder = factory.getBuilder(DEFAULT_WEBHOOK_VERSION, WebhookTriggerEvents.INSTANT_MEETING);

      expect(bookingBuilder).toBeDefined();
      expect(formBuilder).toBeDefined();
      expect(oooBuilder).toBeDefined();
      expect(recordingBuilder).toBeDefined();
      expect(meetingBuilder).toBeDefined();
      expect(instantBuilder).toBeDefined();
    });

    it("should register v2021-10-20 builders", () => {
      const factory = createPayloadBuilderFactory();

      const builder = factory.getBuilder(WebhookVersionEnum.V_2021_10_20, WebhookTriggerEvents.BOOKING_CREATED);
      expect(builder).toBeInstanceOf(V2021_10_20.BookingPayloadBuilder);
    });

    it("should return same factory instance characteristics each time", () => {
      const factory1 = createPayloadBuilderFactory();
      const factory2 = createPayloadBuilderFactory();

      // Both should have same registered versions
      expect(factory1.getRegisteredVersions()).toEqual(factory2.getRegisteredVersions());
    });

    it("should support fallback to default version", () => {
      const factory = createPayloadBuilderFactory();

      // Request non-existent version
      const builder = factory.getBuilder(WebhookVersionEnum.V_2099_01_01, WebhookTriggerEvents.BOOKING_CREATED);

      // Should get default builder, not throw
      expect(builder).toBeDefined();
      expect(builder).toBeInstanceOf(V2021_10_20.BookingPayloadBuilder);
    });
  });

  describe("Factory Composition Root", () => {
    it("should be the single source of truth for version registration", () => {
      const factory = createPayloadBuilderFactory();

      // Should only have default version initially
      expect(factory.getRegisteredVersions()).toHaveLength(1);
      expect(factory.getRegisteredVersions()[0]).toBe(DEFAULT_WEBHOOK_VERSION);
    });

    it("should allow extending with new versions", () => {
      const factory = createPayloadBuilderFactory();

      // Register new version
      const newVersionBuilders = {
        booking: new V2021_10_20.BookingPayloadBuilder(),
        form: new V2021_10_20.FormPayloadBuilder(),
        ooo: new V2021_10_20.OOOPayloadBuilder(),
        recording: new V2021_10_20.RecordingPayloadBuilder(),
        meeting: new V2021_10_20.MeetingPayloadBuilder(),
        instantMeeting: new V2021_10_20.InstantMeetingBuilder(),
      };

      factory.registerVersion(WebhookVersionEnum.V_2024_12_01, newVersionBuilders);

      expect(factory.getRegisteredVersions()).toContain(WebhookVersionEnum.V_2024_12_01);
      expect(factory.getRegisteredVersions()).toHaveLength(2);
    });

    it("should maintain independence of builder instances per version", () => {
      const factory = createPayloadBuilderFactory();

      // Register second version with new instances
      const v2Builders = {
        booking: new V2021_10_20.BookingPayloadBuilder(),
        form: new V2021_10_20.FormPayloadBuilder(),
        ooo: new V2021_10_20.OOOPayloadBuilder(),
        recording: new V2021_10_20.RecordingPayloadBuilder(),
        meeting: new V2021_10_20.MeetingPayloadBuilder(),
        instantMeeting: new V2021_10_20.InstantMeetingBuilder(),
      };

      factory.registerVersion(WebhookVersionEnum.V_2024_12_01, v2Builders);

      const v1Builder = factory.getBuilder(WebhookVersionEnum.V_2021_10_20, WebhookTriggerEvents.BOOKING_CREATED);
      const v2Builder = factory.getBuilder(WebhookVersionEnum.V_2024_12_01, WebhookTriggerEvents.BOOKING_CREATED);

      // Should be different instances
      expect(v1Builder).not.toBe(v2Builder);
    });
  });

  describe("DI Integration", () => {
    it("should be suitable for DI container registration", () => {
      // Factory function is pure and stateless - perfect for DI
      const factory1 = createPayloadBuilderFactory();
      const factory2 = createPayloadBuilderFactory();

      // Both should work independently
      expect(factory1).toBeDefined();
      expect(factory2).toBeDefined();

      // And not interfere with each other
      factory1.registerVersion("test-1", {
        booking: new V2021_10_20.BookingPayloadBuilder(),
        form: new V2021_10_20.FormPayloadBuilder(),
        ooo: new V2021_10_20.OOOPayloadBuilder(),
        recording: new V2021_10_20.RecordingPayloadBuilder(),
        meeting: new V2021_10_20.MeetingPayloadBuilder(),
        instantMeeting: new V2021_10_20.InstantMeetingBuilder(),
      });

      expect(factory1.getRegisteredVersions()).not.toEqual(factory2.getRegisteredVersions());
    });

    it("should initialize without external dependencies", () => {
      // Factory creation should not throw or require external setup
      expect(() => createPayloadBuilderFactory()).not.toThrow();
    });
  });
});

