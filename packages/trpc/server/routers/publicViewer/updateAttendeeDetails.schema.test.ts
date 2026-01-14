import { describe, expect, it } from "vitest";

import { ZUpdateAttendeeDetailsInputSchema } from "./updateAttendeeDetails.schema";

describe("updateAttendeeDetails.schema", () => {
  describe("Required fields", () => {
    it("should pass with valid bookingUid and currentEmail", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "test@example.com",
        name: "New Name",
      });

      expect(result.success).toBe(true);
    });

    it("should fail when bookingUid is missing", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        currentEmail: "test@example.com",
        name: "New Name",
      });

      expect(result.success).toBe(false);
    });

    it("should fail when currentEmail is missing", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        name: "New Name",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Email validation", () => {
    it("should pass with valid email format", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "valid@example.com",
        email: "newemail@example.com",
      });

      expect(result.success).toBe(true);
    });

    it("should fail with invalid currentEmail format", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "invalid-email",
        name: "New Name",
      });

      expect(result.success).toBe(false);
    });

    it("should fail with invalid new email format", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "valid@example.com",
        email: "not-an-email",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Optional fields", () => {
    it("should pass with only name provided", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "test@example.com",
        name: "New Name",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("New Name");
        expect(result.data.email).toBeUndefined();
        expect(result.data.phoneNumber).toBeUndefined();
        expect(result.data.timeZone).toBeUndefined();
      }
    });

    it("should pass with only email provided", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "test@example.com",
        email: "newemail@example.com",
      });

      expect(result.success).toBe(true);
    });

    it("should pass with only phoneNumber provided", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "test@example.com",
        phoneNumber: "+1234567890",
      });

      expect(result.success).toBe(true);
    });

    it("should pass with only timeZone provided", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "test@example.com",
        timeZone: "America/New_York",
      });

      expect(result.success).toBe(true);
    });

    it("should pass with all optional fields provided", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "test@example.com",
        name: "New Name",
        email: "newemail@example.com",
        phoneNumber: "+1234567890",
        timeZone: "Europe/London",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("New Name");
        expect(result.data.email).toBe("newemail@example.com");
        expect(result.data.phoneNumber).toBe("+1234567890");
        expect(result.data.timeZone).toBe("Europe/London");
      }
    });
  });

  describe("Edge cases", () => {
    it("should pass with empty phoneNumber string", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "test@example.com",
        phoneNumber: "",
      });

      expect(result.success).toBe(true);
    });

    it("should pass with complex email formats", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "test+filter@sub.example.com",
        email: "first.last@company.co.uk",
      });

      expect(result.success).toBe(true);
    });

    it("should handle whitespace in name", () => {
      const result = ZUpdateAttendeeDetailsInputSchema.safeParse({
        bookingUid: "test-uid-123",
        currentEmail: "test@example.com",
        name: "  John Doe  ",
      });

      expect(result.success).toBe(true);
    });
  });
});
