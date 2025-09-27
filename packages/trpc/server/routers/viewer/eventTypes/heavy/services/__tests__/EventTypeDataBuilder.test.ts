import { describe, it, expect, beforeEach } from "vitest";
import { EventTypeDataBuilder } from "../builder/EventTypeDataBuilder";
import { SchedulingType } from "@calcom/prisma/enums";

describe("EventTypeDataBuilder", () => {
  let builder: EventTypeDataBuilder;

  beforeEach(() => {
    builder = new EventTypeDataBuilder();
  });

  describe("buildCreateData", () => {
    it("should build data for personal event type", () => {
      const options = {
        title: "30 Min Meeting",
        slug: "30min",
        length: 30,
        userId: 1,
        locations: [{ type: "zoom" }],
        hasCalVideoLocation: false,
      };

      const result = builder.buildCreateData(options as any);

      expect(result).toMatchObject({
        title: "30 Min Meeting",
        slug: "30min",
        length: 30,
        locations: [{ type: "zoom" }],
        owner: { connect: { id: 1 } },
        users: { connect: { id: 1 } },
      });
      expect(result.team).toBeUndefined();
    });

    it("should build data for team event type", () => {
      const options = {
        title: "Team Meeting",
        slug: "team-meeting",
        length: 60,
        userId: 1,
        teamId: 100,
        schedulingType: SchedulingType.COLLECTIVE,
        locations: [],
        hasCalVideoLocation: false,
      };

      const result = builder.buildCreateData(options as any);

      expect(result).toMatchObject({
        title: "Team Meeting",
        slug: "team-meeting",
        length: 60,
        team: { connect: { id: 100 } },
        schedulingType: SchedulingType.COLLECTIVE,
      });
      expect(result.owner).toBeUndefined();
    });

    it("should build data for managed event type", () => {
      const options = {
        title: "Managed Event",
        slug: "managed",
        userId: 1,
        teamId: 100,
        schedulingType: SchedulingType.MANAGED,
        locations: [],
        hasCalVideoLocation: false,
      };

      const result = builder.buildCreateData(options as any);

      expect(result.users).toBeUndefined();
      expect(result.schedulingType).toBe(SchedulingType.MANAGED);
    });

    it("should add Cal.video settings when location is active", () => {
      const options = {
        title: "Video Call",
        slug: "video-call",
        userId: 1,
        locations: [{ type: "daily_video" }],
        hasCalVideoLocation: true,
        calVideoSettings: {
          disableRecordingForGuests: true,
          enableAutomaticTranscription: true,
        },
      };

      const result = builder.buildCreateData(options as any);

      expect(result.calVideoSettings).toBeDefined();
      expect(result.calVideoSettings?.create).toMatchObject({
        disableRecordingForGuests: true,
        enableAutomaticTranscription: true,
      });
    });

    it("should handle schedule connection", () => {
      const options = {
        title: "Scheduled Event",
        slug: "scheduled",
        userId: 1,
        scheduleId: 42,
        locations: [],
        hasCalVideoLocation: false,
      };

      const result = builder.buildCreateData(options as any);

      expect(result.schedule).toEqual({ connect: { id: 42 } });
    });

    it("should handle metadata", () => {
      const metadata = {
        apps: {
          stripe: { price: 100 },
        },
      };

      const options = {
        title: "Paid Event",
        slug: "paid",
        userId: 1,
        metadata,
        locations: [],
        hasCalVideoLocation: false,
      };

      const result = builder.buildCreateData(options as any);

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe("validateData", () => {
    it("should return true for valid data", () => {
      const data = {
        title: "Valid Event",
        slug: "valid-event",
        length: 30,
      };

      const result = builder.validateData(data as any);

      expect(result).toBe(true);
    });

    it("should return false for missing title", () => {
      const data = {
        slug: "no-title",
        length: 30,
      };

      const result = builder.validateData(data as any);

      expect(result).toBe(false);
    });

    it("should return false for empty title", () => {
      const data = {
        title: "",
        slug: "empty-title",
        length: 30,
      };

      const result = builder.validateData(data as any);

      expect(result).toBe(false);
    });

    it("should return false for missing slug", () => {
      const data = {
        title: "No Slug",
        length: 30,
      };

      const result = builder.validateData(data as any);

      expect(result).toBe(false);
    });

    it("should return false for invalid length", () => {
      const data = {
        title: "Invalid Length",
        slug: "invalid-length",
        length: -10,
      };

      const result = builder.validateData(data as any);

      expect(result).toBe(false);
    });
  });

  describe("applyDefaults", () => {
    it("should apply default values for missing fields", () => {
      const data = {
        userId: 1,
      };

      const result = builder.applyDefaults(data);

      expect(result).toMatchObject({
        title: "Untitled Event",
        slug: "untitled",
        description: "",
        length: 30,
        hidden: false,
        position: 0,
        locations: [],
        hasCalVideoLocation: false,
        userId: 1,
      });
    });

    it("should preserve provided values", () => {
      const data = {
        title: "Custom Event",
        slug: "custom",
        length: 45,
        hidden: true,
        userId: 1,
      };

      const result = builder.applyDefaults(data);

      expect(result).toMatchObject({
        title: "Custom Event",
        slug: "custom",
        length: 45,
        hidden: true,
        userId: 1,
      });
    });
  });
});