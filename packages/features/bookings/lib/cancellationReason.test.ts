import { CancellationReasonRequirement } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { isCancellationReasonRequired } from "./cancellationReason";

describe("isCancellationReasonRequired", () => {
  describe("OPTIONAL_BOTH", () => {
    it("returns false for host", () => {
      expect(isCancellationReasonRequired(CancellationReasonRequirement.OPTIONAL_BOTH, true)).toBe(false);
    });

    it("returns false for attendee", () => {
      expect(isCancellationReasonRequired(CancellationReasonRequirement.OPTIONAL_BOTH, false)).toBe(false);
    });
  });

  describe("MANDATORY_BOTH", () => {
    it("returns true for host", () => {
      expect(isCancellationReasonRequired(CancellationReasonRequirement.MANDATORY_BOTH, true)).toBe(true);
    });

    it("returns true for attendee", () => {
      expect(isCancellationReasonRequired(CancellationReasonRequirement.MANDATORY_BOTH, false)).toBe(true);
    });
  });

  describe("MANDATORY_HOST_ONLY", () => {
    it("returns true for host", () => {
      expect(isCancellationReasonRequired(CancellationReasonRequirement.MANDATORY_HOST_ONLY, true)).toBe(
        true
      );
    });

    it("returns false for attendee", () => {
      expect(isCancellationReasonRequired(CancellationReasonRequirement.MANDATORY_HOST_ONLY, false)).toBe(
        false
      );
    });
  });

  describe("MANDATORY_ATTENDEE_ONLY", () => {
    it("returns false for host", () => {
      expect(isCancellationReasonRequired(CancellationReasonRequirement.MANDATORY_ATTENDEE_ONLY, true)).toBe(
        false
      );
    });

    it("returns true for attendee", () => {
      expect(isCancellationReasonRequired(CancellationReasonRequirement.MANDATORY_ATTENDEE_ONLY, false)).toBe(
        true
      );
    });
  });

  describe("null/undefined defaults to MANDATORY_HOST_ONLY", () => {
    it("returns true for host when null", () => {
      expect(isCancellationReasonRequired(null, true)).toBe(true);
    });

    it("returns false for attendee when null", () => {
      expect(isCancellationReasonRequired(null, false)).toBe(false);
    });

    it("returns true for host when undefined", () => {
      expect(isCancellationReasonRequired(undefined, true)).toBe(true);
    });

    it("returns false for attendee when undefined", () => {
      expect(isCancellationReasonRequired(undefined, false)).toBe(false);
    });
  });
});
