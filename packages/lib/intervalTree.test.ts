import { describe, expect, it } from "vitest";
import { ContainmentSearchAlgorithm, createIntervalNodes, IntervalTree } from "./intervalTree";

type TestInterval = {
  label: string;
  start: number;
  end: number;
};

function buildSearch(intervals: TestInterval[]): ContainmentSearchAlgorithm<TestInterval> {
  const nodes = createIntervalNodes(
    intervals,
    (interval) => interval.start,
    (interval) => interval.end
  );
  const tree = new IntervalTree(nodes);

  return new ContainmentSearchAlgorithm(tree);
}

function findLabels(
  intervals: TestInterval[],
  targetStart: number,
  targetEnd: number,
  targetIndex: number
): string[] {
  return buildSearch(intervals)
    .findContainingIntervals(targetStart, targetEnd, targetIndex)
    .map((node) => node.item.label)
    .sort();
}

describe("ContainmentSearchAlgorithm.findContainingIntervals", () => {
  describe("equivalence partitioning", () => {
    it("CE1 returns no containing intervals for an empty tree", () => {
      expect(findLabels([], 10, 20, 0)).toEqual([]);
    });

    it("CE2 includes a node that contains the target interval", () => {
      const intervals = [{ label: "container", start: 0, end: 100 }];

      expect(findLabels(intervals, 10, 20, -1)).toEqual(["container"]);
    });

    it("CE3 excludes a node that starts after the target start", () => {
      const intervals = [{ label: "starts-after", start: 50, end: 100 }];

      expect(findLabels(intervals, 10, 20, -1)).toEqual([]);
    });

    it("CE4 excludes a node that ends before the target end", () => {
      const intervals = [{ label: "ends-before", start: 0, end: 15 }];

      expect(findLabels(intervals, 10, 20, -1)).toEqual([]);
    });

    it("CE5 excludes the target itself when the index matches", () => {
      const intervals = [{ label: "same-index", start: 0, end: 100 }];

      expect(findLabels(intervals, 10, 20, 0)).toEqual([]);
    });

    it("CE6 skips a degenerate node and continues searching its children", () => {
      const intervals = [
        { label: "left-container", start: 0, end: 100 },
        { label: "degenerate-root", start: 100, end: 0 },
        { label: "right-container", start: 5, end: 80 },
      ];

      expect(findLabels(intervals, 10, 20, -1)).toEqual(["left-container", "right-container"]);
    });

    it("CE7 returns multiple nodes that contain the target interval", () => {
      const intervals = [
        { label: "wide-container", start: 0, end: 100 },
        { label: "narrow-container", start: 5, end: 50 },
        { label: "target", start: 10, end: 20 },
      ];

      expect(findLabels(intervals, 10, 20, 2)).toEqual(["narrow-container", "wide-container"]);
    });
  });

  describe("boundary value analysis", () => {
    it("VL1 includes an interval with exactly equal boundaries", () => {
      const intervals = [{ label: "same-boundaries", start: 10, end: 20 }];

      expect(findLabels(intervals, 10, 20, -1)).toEqual(["same-boundaries"]);
    });

    it("VL2 excludes an interval whose start is one unit above the target start", () => {
      const intervals = [{ label: "start-above", start: 11, end: 20 }];

      expect(findLabels(intervals, 10, 20, -1)).toEqual([]);
    });

    it("VL3 excludes an interval whose end is one unit below the target end", () => {
      const intervals = [{ label: "end-below", start: 10, end: 19 }];

      expect(findLabels(intervals, 10, 20, -1)).toEqual([]);
    });
  });

  describe("MC/DC for containment decision", () => {
    it("M1 does not include when A is false and B and C are true", () => {
      const intervals = [{ label: "starts-after", start: 11, end: 20 }];

      expect(findLabels(intervals, 10, 20, -1)).toEqual([]);
    });

    it("M2 does not include when B is false and A and C are true", () => {
      const intervals = [{ label: "ends-before", start: 10, end: 19 }];

      expect(findLabels(intervals, 10, 20, -1)).toEqual([]);
    });

    it("M3 does not include when C is false and A and B are true", () => {
      const intervals = [{ label: "same-index", start: 10, end: 20 }];

      expect(findLabels(intervals, 10, 20, 0)).toEqual([]);
    });

    it("M4 includes when A, B and C are true", () => {
      const intervals = [{ label: "contains", start: 10, end: 20 }];

      expect(findLabels(intervals, 10, 20, -1)).toEqual(["contains"]);
    });
  });

  describe("white-box pruning decisions", () => {
    it("searches the left subtree only when its maxEnd can still contain the target", () => {
      const intervals = [
        { label: "left-too-short", start: 0, end: 5 },
        { label: "root-container", start: 0, end: 100 },
        { label: "right-container", start: 5, end: 50 },
      ];

      expect(findLabels(intervals, 10, 20, -1)).toEqual(["right-container", "root-container"]);
    });

    it("searches the right subtree only while node start is at or before the target end", () => {
      const intervals = [
        { label: "left-container", start: 0, end: 100 },
        { label: "root-starts-after-target", start: 30, end: 100 },
        { label: "right-container-but-pruned", start: 0, end: 100 },
      ];

      expect(findLabels(intervals, 10, 20, -1)).toEqual(["left-container"]);
    });
  });
});
