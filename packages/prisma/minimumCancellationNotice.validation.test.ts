import { describe, it, expect, beforeEach, vi } from "vitest";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

// Mock Prisma client
const prisma = new PrismaClient();

// Define the Zod schema for EventType with minimumCancellationNotice validation
const EventTypeSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().min(1),
  slug: z.string(),
  description: z.string().nullable().optional(),
  length: z.number().int().min(1),
  minimumCancellationNotice: z.number().int().min(0).default(0),
  hidden: z.boolean().default(false),
  position: z.number().int().default(0),
  userId: z.number().int().nullable().optional(),
  teamId: z.number().int().nullable().optional(),
  parentId: z.number().int().nullable().optional(),
});

// Create a validation wrapper for EventType operations
class EventTypeValidator {
  static validateCreate(data: any) {
    return EventTypeSchema.parse(data);
  }

  static validateUpdate(data: any) {
    return EventTypeSchema.partial().parse(data);
  }

  static isValidCancellationNotice(minutes: number): boolean {
    return Number.isInteger(minutes) && minutes >= 0;
  }

  static convertHoursToMinutes(hours: number): number {
    return hours * 60;
  }

  static convertDaysToMinutes(days: number): number {
    return days * 24 * 60;
  }
}

describe("minimumCancellationNotice Validation Tests", () => {
  describe("Zod Schema Validation", () => {
    it("should validate correct minimumCancellationNotice values", () => {
      const validData = {
        title: "Test Event",
        slug: "test-event",
        length: 30,
        minimumCancellationNotice: 1440, // 24 hours
      };

      const result = EventTypeSchema.parse(validData);
      expect(result.minimumCancellationNotice).toBe(1440);
    });

    it("should apply default value of 0 when minimumCancellationNotice is not provided", () => {
      const dataWithoutNotice = {
        title: "Test Event",
        slug: "test-event",
        length: 30,
      };

      const result = EventTypeSchema.parse(dataWithoutNotice);
      expect(result.minimumCancellationNotice).toBe(0);
    });

    it("should reject negative minimumCancellationNotice values", () => {
      const invalidData = {
        title: "Test Event",
        slug: "test-event",
        length: 30,
        minimumCancellationNotice: -60,
      };

      expect(() => EventTypeSchema.parse(invalidData)).toThrow();
    });

    it("should reject non-integer minimumCancellationNotice values", () => {
      const invalidData = {
        title: "Test Event",
        slug: "test-event",
        length: 30,
        minimumCancellationNotice: 30.5,
      };

      expect(() => EventTypeSchema.parse(invalidData)).toThrow();
    });

    it("should reject non-numeric minimumCancellationNotice values", () => {
      const invalidData = {
        title: "Test Event",
        slug: "test-event",
        length: 30,
        minimumCancellationNotice: "24 hours",
      };

      expect(() => EventTypeSchema.parse(invalidData)).toThrow();
    });

    it("should handle null and undefined differently", () => {
      // undefined should use default
      const dataWithUndefined = {
        title: "Test Event",
        slug: "test-event",
        length: 30,
        minimumCancellationNotice: undefined,
      };
      const resultUndefined = EventTypeSchema.parse(dataWithUndefined);
      expect(resultUndefined.minimumCancellationNotice).toBe(0);

      // null should throw error
      const dataWithNull = {
        title: "Test Event",
        slug: "test-event",
        length: 30,
        minimumCancellationNotice: null,
      };
      expect(() => EventTypeSchema.parse(dataWithNull)).toThrow();
    });
  });

  describe("Business Logic Validation", () => {
    it("should validate common cancellation notice periods", () => {
      const commonPeriods = [
        { value: 0, description: "No notice required", valid: true },
        { value: 15, description: "15 minutes", valid: true },
        { value: 30, description: "30 minutes", valid: true },
        { value: 60, description: "1 hour", valid: true },
        { value: 120, description: "2 hours", valid: true },
        { value: 240, description: "4 hours", valid: true },
        { value: 360, description: "6 hours", valid: true },
        { value: 720, description: "12 hours", valid: true },
        { value: 1440, description: "24 hours (1 day)", valid: true },
        { value: 2880, description: "48 hours (2 days)", valid: true },
        { value: 4320, description: "72 hours (3 days)", valid: true },
        { value: 10080, description: "1 week", valid: true },
        { value: 20160, description: "2 weeks", valid: true },
      ];

      commonPeriods.forEach(({ value, description, valid }) => {
        const isValid = EventTypeValidator.isValidCancellationNotice(value);
        expect(isValid).toBe(valid);
      });
    });

    it("should validate edge cases for minimumCancellationNotice", () => {
      // Zero (minimum valid value)
      expect(EventTypeValidator.isValidCancellationNotice(0)).toBe(true);

      // Very large value (1 year in minutes)
      expect(EventTypeValidator.isValidCancellationNotice(525600)).toBe(true);

      // Maximum safe integer
      expect(EventTypeValidator.isValidCancellationNotice(Number.MAX_SAFE_INTEGER)).toBe(true);

      // Invalid values
      expect(EventTypeValidator.isValidCancellationNotice(-1)).toBe(false);
      expect(EventTypeValidator.isValidCancellationNotice(NaN)).toBe(false);
      expect(EventTypeValidator.isValidCancellationNotice(Infinity)).toBe(false);
      expect(EventTypeValidator.isValidCancellationNotice(-Infinity)).toBe(false);
    });

    it("should correctly convert time units to minutes", () => {
      // Hours to minutes
      expect(EventTypeValidator.convertHoursToMinutes(1)).toBe(60);
      expect(EventTypeValidator.convertHoursToMinutes(2.5)).toBe(150);
      expect(EventTypeValidator.convertHoursToMinutes(24)).toBe(1440);

      // Days to minutes
      expect(EventTypeValidator.convertDaysToMinutes(1)).toBe(1440);
      expect(EventTypeValidator.convertDaysToMinutes(2)).toBe(2880);
      expect(EventTypeValidator.convertDaysToMinutes(7)).toBe(10080);
    });
  });

  describe("Update Validation", () => {
    it("should allow partial updates with minimumCancellationNotice", () => {
      const updateData = {
        minimumCancellationNotice: 480,
      };

      const result = EventTypeValidator.validateUpdate(updateData);
      expect(result.minimumCancellationNotice).toBe(480);
    });

    it("should reject invalid updates to minimumCancellationNotice", () => {
      const invalidUpdate = {
        minimumCancellationNotice: -120,
      };

      expect(() => EventTypeValidator.validateUpdate(invalidUpdate)).toThrow();
    });

    it("should allow updates without minimumCancellationNotice", () => {
      const updateData = {
        title: "Updated Title",
        length: 45,
      };

      const result = EventTypeValidator.validateUpdate(updateData);
      expect(result.minimumCancellationNotice).toBeUndefined();
      expect(result.title).toBe("Updated Title");
      expect(result.length).toBe(45);
    });
  });

  describe("Validation Error Messages", () => {
    it("should provide meaningful error messages for validation failures", () => {
      const testCases = [
        {
          data: { minimumCancellationNotice: -60 },
          expectedError: /too_small|minimum|greater than or equal to 0/i,
        },
        {
          data: { minimumCancellationNotice: "invalid" },
          expectedError: /expected number|invalid_type/i,
        },
        {
          data: { minimumCancellationNotice: 30.5 },
          expectedError: /expected integer|invalid_type|must be an integer/i,
        },
        {
          data: { minimumCancellationNotice: null },
          expectedError: /expected number|invalid_type/i,
        },
      ];

      testCases.forEach(({ data, expectedError }) => {
        try {
          EventTypeSchema.partial().parse(data);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessage = error.errors.map(e => e.message).join(", ");
            expect(errorMessage).toMatch(expectedError);
          } else {
            // If it's not a ZodError, check the error message directly
            expect(String(error)).toMatch(expectedError);
          }
        }
      });
    });
  });

  describe("Complex Validation Scenarios", () => {
    it("should validate EventType with all fields including minimumCancellationNotice", () => {
      const completeData = {
        id: 1,
        title: "Complete Event Type",
        slug: "complete-event-type",
        description: "A complete event type with all fields",
        length: 60,
        minimumCancellationNotice: 720,
        hidden: false,
        position: 0,
        userId: 123,
        teamId: null,
        parentId: null,
      };

      const result = EventTypeSchema.parse(completeData);
      expect(result.minimumCancellationNotice).toBe(720);
      expect(result.title).toBe("Complete Event Type");
    });

    it("should validate minimumCancellationNotice in relation to event length", () => {
      // Business rule: cancellation notice can be longer than event length
      const eventData = {
        title: "Short Event",
        slug: "short-event",
        length: 15, // 15 minute event
        minimumCancellationNotice: 1440, // 24 hour cancellation notice
      };

      const result = EventTypeSchema.parse(eventData);
      
      // This is valid - you can require 24 hours notice for a 15-minute event
      expect(result.minimumCancellationNotice).toBe(1440);
      expect(result.length).toBe(15);
      expect(result.minimumCancellationNotice > result.length).toBe(true);
    });

    it("should handle batch validation of multiple EventTypes", () => {
      const eventTypes = [
        {
          title: "Event 1",
          slug: "event-1",
          length: 30,
          minimumCancellationNotice: 0,
        },
        {
          title: "Event 2",
          slug: "event-2",
          length: 45,
          minimumCancellationNotice: 360,
        },
        {
          title: "Event 3",
          slug: "event-3",
          length: 60,
          minimumCancellationNotice: 1440,
        },
      ];

      const results = eventTypes.map(data => EventTypeSchema.parse(data));
      
      expect(results).toHaveLength(3);
      expect(results[0].minimumCancellationNotice).toBe(0);
      expect(results[1].minimumCancellationNotice).toBe(360);
      expect(results[2].minimumCancellationNotice).toBe(1440);
    });

    it("should validate array of minimumCancellationNotice values", () => {
      const ArraySchema = z.array(z.number().int().min(0));
      
      const validArray = [0, 60, 120, 1440, 2880];
      const result = ArraySchema.parse(validArray);
      expect(result).toEqual(validArray);

      const invalidArray = [0, 60, -30, 1440];
      expect(() => ArraySchema.parse(invalidArray)).toThrow();
    });
  });

  describe("Custom Validation Rules", () => {
    it("should enforce maximum cancellation notice limit", () => {
      // Custom rule: maximum 30 days (43200 minutes) cancellation notice
      const MAX_CANCELLATION_NOTICE = 43200;
      
      const CustomEventTypeSchema = EventTypeSchema.extend({
        minimumCancellationNotice: z
          .number()
          .int()
          .min(0)
          .max(MAX_CANCELLATION_NOTICE, "Cancellation notice cannot exceed 30 days")
          .default(0),
      });

      // Valid: within limit
      const validData = {
        title: "Test Event",
        slug: "test-event",
        length: 30,
        minimumCancellationNotice: 20160, // 14 days
      };
      const result = CustomEventTypeSchema.parse(validData);
      expect(result.minimumCancellationNotice).toBe(20160);

      // Invalid: exceeds limit
      const invalidData = {
        title: "Test Event",
        slug: "test-event",
        length: 30,
        minimumCancellationNotice: 50000, // > 30 days
      };
      expect(() => CustomEventTypeSchema.parse(invalidData)).toThrow(/cannot exceed 30 days/);
    });

    it("should validate minimumCancellationNotice based on event type", () => {
      // Custom validation based on event type
      const validateByEventType = (eventType: string, cancellationNotice: number): boolean => {
        switch (eventType) {
          case "instant":
            return cancellationNotice === 0;
          case "standard":
            return cancellationNotice >= 60 && cancellationNotice <= 1440;
          case "premium":
            return cancellationNotice >= 1440;
          default:
            return cancellationNotice >= 0;
        }
      };

      expect(validateByEventType("instant", 0)).toBe(true);
      expect(validateByEventType("instant", 60)).toBe(false);
      
      expect(validateByEventType("standard", 360)).toBe(true);
      expect(validateByEventType("standard", 30)).toBe(false);
      
      expect(validateByEventType("premium", 2880)).toBe(true);
      expect(validateByEventType("premium", 720)).toBe(false);
    });

    it("should validate minimumCancellationNotice with refinements", () => {
      // Schema with custom refinements
      const RefinedEventTypeSchema = EventTypeSchema.refine(
        (data) => {
          // Custom rule: if event is longer than 2 hours, require at least 6 hours notice
          if (data.length > 120) {
            return data.minimumCancellationNotice >= 360;
          }
          return true;
        },
        {
          message: "Events longer than 2 hours require at least 6 hours cancellation notice",
        }
      );

      // Valid: short event with any notice
      const validShortEvent = {
        title: "Short Event",
        slug: "short-event",
        length: 60,
        minimumCancellationNotice: 60,
      };
      expect(() => RefinedEventTypeSchema.parse(validShortEvent)).not.toThrow();

      // Valid: long event with sufficient notice
      const validLongEvent = {
        title: "Long Event",
        slug: "long-event",
        length: 180,
        minimumCancellationNotice: 720,
      };
      expect(() => RefinedEventTypeSchema.parse(validLongEvent)).not.toThrow();

      // Invalid: long event with insufficient notice
      const invalidLongEvent = {
        title: "Long Event",
        slug: "long-event",
        length: 180,
        minimumCancellationNotice: 120,
      };
      expect(() => RefinedEventTypeSchema.parse(invalidLongEvent)).toThrow(/at least 6 hours/);
    });
  });
});