import { describe, expect, it } from "vitest";

import { AccessScope } from "@calcom/prisma/enums";

import { hasScopeExpansion } from "./hasScopeExpansion";

describe("hasScopeExpansion", () => {
  describe("identical scopes", () => {
    it("returns false when both arrays are empty", () => {
      expect(hasScopeExpansion([], [])).toBe(false);
    });

    it("returns false when new scopes are identical to current scopes", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_READ],
          [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_READ]
        )
      ).toBe(false);
    });

    it("returns false when new scopes are identical but in different order", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.SCHEDULE_READ, AccessScope.BOOKING_READ],
          [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_READ]
        )
      ).toBe(false);
    });
  });

  describe("adding new scopes", () => {
    it("returns true when adding a scope to an empty set", () => {
      expect(hasScopeExpansion([], [AccessScope.BOOKING_READ])).toBe(true);
    });

    it("returns true when adding a new READ scope for a different resource", () => {
      expect(
        hasScopeExpansion([AccessScope.BOOKING_READ], [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_READ])
      ).toBe(true);
    });

    it("returns true when adding a new WRITE scope for a different resource", () => {
      expect(
        hasScopeExpansion([AccessScope.BOOKING_READ], [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_WRITE])
      ).toBe(true);
    });

    it("returns true when adding an entirely unrelated scope", () => {
      expect(
        hasScopeExpansion([AccessScope.EVENT_TYPE_READ], [AccessScope.EVENT_TYPE_READ, AccessScope.APPS_READ])
      ).toBe(true);
    });
  });

  describe("removing scopes", () => {
    it("returns false when removing a scope", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_READ],
          [AccessScope.BOOKING_READ]
        )
      ).toBe(false);
    });

    it("returns false when removing all scopes", () => {
      expect(hasScopeExpansion([AccessScope.BOOKING_READ, AccessScope.SCHEDULE_WRITE], [])).toBe(false);
    });

    it("returns false when removing multiple scopes", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_READ, AccessScope.APPS_READ],
          [AccessScope.BOOKING_READ]
        )
      ).toBe(false);
    });
  });

  describe("READ/WRITE demotion (same resource)", () => {
    it("returns false when demoting BOOKING_WRITE to BOOKING_READ", () => {
      expect(hasScopeExpansion([AccessScope.BOOKING_WRITE], [AccessScope.BOOKING_READ])).toBe(false);
    });

    it("returns false when demoting EVENT_TYPE_WRITE to EVENT_TYPE_READ", () => {
      expect(hasScopeExpansion([AccessScope.EVENT_TYPE_WRITE], [AccessScope.EVENT_TYPE_READ])).toBe(false);
    });

    it("returns false when demoting SCHEDULE_WRITE to SCHEDULE_READ", () => {
      expect(hasScopeExpansion([AccessScope.SCHEDULE_WRITE], [AccessScope.SCHEDULE_READ])).toBe(false);
    });

    it("returns false when demoting APPS_WRITE to APPS_READ", () => {
      expect(hasScopeExpansion([AccessScope.APPS_WRITE], [AccessScope.APPS_READ])).toBe(false);
    });

    it("returns false when demoting PROFILE_WRITE to PROFILE_READ", () => {
      expect(hasScopeExpansion([AccessScope.PROFILE_WRITE], [AccessScope.PROFILE_READ])).toBe(false);
    });
  });

  describe("adding READ alongside existing WRITE (same resource)", () => {
    it("returns false when adding BOOKING_READ alongside BOOKING_WRITE", () => {
      expect(
        hasScopeExpansion([AccessScope.BOOKING_WRITE], [AccessScope.BOOKING_WRITE, AccessScope.BOOKING_READ])
      ).toBe(false);
    });

    it("returns false when adding SCHEDULE_READ alongside SCHEDULE_WRITE", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.SCHEDULE_WRITE],
          [AccessScope.SCHEDULE_WRITE, AccessScope.SCHEDULE_READ]
        )
      ).toBe(false);
    });

    it("returns false when adding APPS_READ alongside APPS_WRITE", () => {
      expect(
        hasScopeExpansion([AccessScope.APPS_WRITE], [AccessScope.APPS_WRITE, AccessScope.APPS_READ])
      ).toBe(false);
    });
  });

  describe("READ to WRITE upgrade (same resource)", () => {
    it("returns true when upgrading BOOKING_READ to BOOKING_WRITE", () => {
      expect(hasScopeExpansion([AccessScope.BOOKING_READ], [AccessScope.BOOKING_WRITE])).toBe(true);
    });

    it("returns true when upgrading SCHEDULE_READ to SCHEDULE_WRITE", () => {
      expect(hasScopeExpansion([AccessScope.SCHEDULE_READ], [AccessScope.SCHEDULE_WRITE])).toBe(true);
    });

    it("returns true when adding WRITE alongside existing READ", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.BOOKING_READ],
          [AccessScope.BOOKING_READ, AccessScope.BOOKING_WRITE]
        )
      ).toBe(true);
    });
  });

  describe("mixed operations", () => {
    it("returns false when demoting WRITE to READ and removing another scope", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.BOOKING_WRITE, AccessScope.SCHEDULE_READ],
          [AccessScope.BOOKING_READ]
        )
      ).toBe(false);
    });

    it("returns true when demoting one scope but adding an entirely new one", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.BOOKING_WRITE],
          [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_READ]
        )
      ).toBe(true);
    });

    it("returns true when removing one scope but adding a different new one", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_READ],
          [AccessScope.BOOKING_READ, AccessScope.APPS_READ]
        )
      ).toBe(true);
    });

    it("returns false when demoting multiple WRITEs to READs simultaneously", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.BOOKING_WRITE, AccessScope.SCHEDULE_WRITE],
          [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_READ]
        )
      ).toBe(false);
    });

    it("returns true when demoting one WRITE to READ but upgrading another READ to WRITE", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.BOOKING_WRITE, AccessScope.SCHEDULE_READ],
          [AccessScope.BOOKING_READ, AccessScope.SCHEDULE_WRITE]
        )
      ).toBe(true);
    });
  });

  describe("legacy scopes", () => {
    it("returns true when adding a legacy scope", () => {
      expect(
        hasScopeExpansion([AccessScope.BOOKING_READ], [AccessScope.BOOKING_READ, AccessScope.READ_PROFILE])
      ).toBe(true);
    });

    it("returns false when legacy scope already exists", () => {
      expect(
        hasScopeExpansion(
          [AccessScope.READ_BOOKING, AccessScope.READ_PROFILE],
          [AccessScope.READ_BOOKING, AccessScope.READ_PROFILE]
        )
      ).toBe(false);
    });
  });
});
