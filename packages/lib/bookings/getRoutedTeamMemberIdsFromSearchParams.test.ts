import { describe, expect, it } from "vitest";
import { getRoutedTeamMemberIdsFromSearchParams } from "./getRoutedTeamMemberIdsFromSearchParams";

describe("getRoutedTeamMemberIdsFromSearchParams", () => {
  it("returns null when param is not present", () => {
    const params = new URLSearchParams();
    const result = getRoutedTeamMemberIdsFromSearchParams(params);
    expect(result).toBeNull();
  });

  it("parses comma-separated IDs to number array", () => {
    const params = new URLSearchParams({ "cal.routedTeamMemberIds": "1,2,3" });
    const result = getRoutedTeamMemberIdsFromSearchParams(params);
    expect(result).toEqual([1, 2, 3]);
  });

  it("filters out empty strings from trailing commas", () => {
    const params = new URLSearchParams({ "cal.routedTeamMemberIds": "1,2," });
    const result = getRoutedTeamMemberIdsFromSearchParams(params);
    expect(result).toEqual([1, 2]);
  });

  it("handles single ID", () => {
    const params = new URLSearchParams({ "cal.routedTeamMemberIds": "42" });
    const result = getRoutedTeamMemberIdsFromSearchParams(params);
    expect(result).toEqual([42]);
  });

  it("handles multiple IDs", () => {
    const params = new URLSearchParams({ "cal.routedTeamMemberIds": "10,20,30,40,50" });
    const result = getRoutedTeamMemberIdsFromSearchParams(params);
    expect(result).toEqual([10, 20, 30, 40, 50]);
  });

  it("returns empty array for empty string value", () => {
    const params = new URLSearchParams({ "cal.routedTeamMemberIds": "" });
    const result = getRoutedTeamMemberIdsFromSearchParams(params);
    expect(result).toEqual([]);
  });
});
