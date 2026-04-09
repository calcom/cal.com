import type { CombinedFilterSegment } from "@calcom/features/data-table/lib/types";
import { describe, expect, it } from "vitest";
import { findSegmentById, toSegmentIdObject } from "../segment-helpers";

// ─── Test data ──────────────────────────────────────────────────────────────

const userSegment: CombinedFilterSegment = {
  id: 42,
  name: "My segment",
  type: "user",
  tableIdentifier: "/bookings/upcoming",
  scope: "USER" as const,
  activeFilters: [],
  sorting: [],
  columnVisibility: {},
  columnSizing: {},
  perPage: 10,
  searchTerm: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 1,
  teamId: null,
  team: null,
};

const systemSegment: CombinedFilterSegment = {
  id: "system_all",
  name: "All bookings",
  type: "system",
  tableIdentifier: "/bookings/upcoming",
  activeFilters: [],
  sorting: [],
  columnVisibility: {},
  columnSizing: {},
  perPage: 10,
  searchTerm: null,
};

const segments: CombinedFilterSegment[] = [userSegment, systemSegment];

// ─── findSegmentById ────────────────────────────────────────────────────────

describe("findSegmentById", () => {
  it("finds a user segment by numeric string id", () => {
    expect(findSegmentById(segments, "42")).toBe(userSegment);
  });

  it("finds a system segment by prefixed string id", () => {
    expect(findSegmentById(segments, "system_all")).toBe(systemSegment);
  });

  it("returns undefined for a non-existent user segment id", () => {
    expect(findSegmentById(segments, "999")).toBeUndefined();
  });

  it("returns undefined for a non-existent system segment id", () => {
    expect(findSegmentById(segments, "system_nonexistent")).toBeUndefined();
  });

  it("returns undefined for an empty segments array", () => {
    expect(findSegmentById([], "42")).toBeUndefined();
  });

  it("does not match a system prefix against a user segment", () => {
    expect(findSegmentById([userSegment], "system_42")).toBeUndefined();
  });

  it("does not match a numeric string against a system segment", () => {
    expect(findSegmentById([systemSegment], "42")).toBeUndefined();
  });

  it("returns undefined for non-numeric, non-system string", () => {
    expect(findSegmentById(segments, "abc")).toBeUndefined();
  });
});

// ─── toSegmentIdObject ──────────────────────────────────────────────────────

describe("toSegmentIdObject", () => {
  it("returns null for null input", () => {
    expect(toSegmentIdObject(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(toSegmentIdObject("")).toBeNull();
  });

  it("returns a user identifier for a numeric string", () => {
    expect(toSegmentIdObject("42")).toEqual({ id: 42, type: "user" });
  });

  it("returns a system identifier for a system-prefixed string", () => {
    expect(toSegmentIdObject("system_all")).toEqual({ id: "system_all", type: "system" });
  });

  it("returns null for a non-numeric, non-system string", () => {
    expect(toSegmentIdObject("abc")).toBeNull();
  });

  it("handles string '0' as a valid user segment id", () => {
    expect(toSegmentIdObject("0")).toEqual({ id: 0, type: "user" });
  });
});
