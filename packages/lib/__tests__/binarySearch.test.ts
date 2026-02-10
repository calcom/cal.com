import { describe, expect, it } from "vitest";
import { binarySearchRangeIndex } from "../binarySearch";

describe("binarySearchRangeIndex", () => {
  it("returns -1 for an empty array", () => {
    expect(binarySearchRangeIndex([], 5)).toBe(-1);
  });

  it("returns -1 when all elements are greater than the value", () => {
    expect(binarySearchRangeIndex([10, 20, 30], 5)).toBe(-1);
  });

  it("returns last index when all elements are less than or equal to value", () => {
    expect(binarySearchRangeIndex([1, 2, 3], 10)).toBe(2);
  });

  it("returns the index of an exact match", () => {
    expect(binarySearchRangeIndex([10, 20, 30], 20)).toBe(1);
  });

  it("returns the index of the last element <= value when value falls between elements", () => {
    expect(binarySearchRangeIndex([10, 20, 30], 25)).toBe(1);
  });

  it("handles a single element - value less than element", () => {
    expect(binarySearchRangeIndex([10], 5)).toBe(-1);
  });

  it("handles a single element - value equal to element", () => {
    expect(binarySearchRangeIndex([10], 10)).toBe(0);
  });

  it("handles a single element - value greater than element", () => {
    expect(binarySearchRangeIndex([10], 15)).toBe(0);
  });

  it("handles duplicate values in the array", () => {
    expect(binarySearchRangeIndex([10, 10, 20, 20, 30], 20)).toBe(3);
  });

  it("returns correct index for value equal to the first element", () => {
    expect(binarySearchRangeIndex([10, 20, 30], 10)).toBe(0);
  });

  it("returns correct index for value equal to the last element", () => {
    expect(binarySearchRangeIndex([10, 20, 30], 30)).toBe(2);
  });

  it("works with timestamp-sized numbers", () => {
    const starts = [1700000000000, 1700003600000, 1700007200000];
    expect(binarySearchRangeIndex(starts, 1700005000000)).toBe(1);
  });
});
