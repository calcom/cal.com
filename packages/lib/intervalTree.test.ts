import { describe, expect, it } from "vitest";

import { ContainmentSearchAlgorithm, IntervalTree, createIntervalNodes } from "./intervalTree";

describe("createIntervalNodes", () => {
  it("creates nodes from items with correct start, end, index, and maxEnd", () => {
    const items = [
      { from: 10, to: 20 },
      { from: 30, to: 50 },
    ];
    const nodes = createIntervalNodes(
      items,
      (i) => i.from,
      (i) => i.to
    );

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toEqual({ item: items[0], index: 0, start: 10, end: 20, maxEnd: 20 });
    expect(nodes[1]).toEqual({ item: items[1], index: 1, start: 30, end: 50, maxEnd: 50 });
  });

  it("handles empty array", () => {
    const nodes = createIntervalNodes(
      [],
      () => 0,
      () => 0
    );
    expect(nodes).toEqual([]);
  });

  it("handles single item", () => {
    const nodes = createIntervalNodes(
      [{ s: 5, e: 15 }],
      (i) => i.s,
      (i) => i.e
    );
    expect(nodes).toHaveLength(1);
    expect(nodes[0].start).toBe(5);
    expect(nodes[0].end).toBe(15);
    expect(nodes[0].index).toBe(0);
  });
});

describe("IntervalTree", () => {
  it("builds a tree from nodes", () => {
    const nodes = createIntervalNodes(
      [
        { s: 0, e: 10 },
        { s: 5, e: 15 },
        { s: 20, e: 30 },
      ],
      (i) => i.s,
      (i) => i.e
    );
    const tree = new IntervalTree(nodes);
    const root = tree.getRoot();

    expect(root).toBeDefined();
  });

  it("builds a tree and returns root with correct values", () => {
    const nodes = createIntervalNodes(
      [{ s: 0, e: 10 }],
      (i) => i.s,
      (i) => i.e
    );
    const tree = new IntervalTree(nodes);
    expect(tree.getRoot()).toBeDefined();
    expect(tree.getRoot()?.start).toBe(0);
    expect(tree.getRoot()?.end).toBe(10);
  });

  it("returns undefined root for empty nodes", () => {
    const tree = new IntervalTree([]);
    expect(tree.getRoot()).toBeUndefined();
  });

  it("correctly computes maxEnd across the tree", () => {
    // Nodes sorted by start: [0,10], [5,100], [20,30]
    // Mid node is [5,100], maxEnd should be 100 (from itself)
    const nodes = createIntervalNodes(
      [
        { s: 0, e: 10 },
        { s: 5, e: 100 },
        { s: 20, e: 30 },
      ],
      (i) => i.s,
      (i) => i.e
    );
    const tree = new IntervalTree(nodes);
    const root = tree.getRoot();

    expect(root).toBeDefined();
    expect(root!.maxEnd).toBe(100);
  });

  it("does not mutate the original nodes array", () => {
    const nodes = createIntervalNodes(
      [
        { s: 10, e: 20 },
        { s: 0, e: 5 },
      ],
      (i) => i.s,
      (i) => i.e
    );
    const originalLength = nodes.length;
    new IntervalTree(nodes);
    expect(nodes).toHaveLength(originalLength);
  });
});

describe("ContainmentSearchAlgorithm", () => {
  function buildSearch(intervals: { s: number; e: number }[]) {
    const nodes = createIntervalNodes(
      intervals,
      (i) => i.s,
      (i) => i.e
    );
    const tree = new IntervalTree(nodes);
    return new ContainmentSearchAlgorithm(tree);
  }

  it("finds intervals that fully contain the target", () => {
    // Interval [0, 100] contains [10, 20]
    const search = buildSearch([
      { s: 0, e: 100 },
      { s: 10, e: 20 },
      { s: 50, e: 60 },
    ]);

    const results = search.findContainingIntervals(10, 20, 1); // target is index 1
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.start === 0 && r.end === 100)).toBe(true);
  });

  it("finds all containing intervals and excludes self", () => {
    const nodes = createIntervalNodes(
      [
        { s: 0, e: 100 },
        { s: 10, e: 50 },
        { s: 20, e: 30 },
      ],
      (i) => i.s,
      (i) => i.e
    );
    const tree = new IntervalTree(nodes);
    const search = new ContainmentSearchAlgorithm(tree);

    // Find intervals containing [20, 30] (index=2)
    const results = search.findContainingIntervals(20, 30, 2);
    const indices = results.map((r) => r.index);

    expect(indices).toContain(0); // [0, 100] contains [20, 30]
    expect(indices).toContain(1); // [10, 50] contains [20, 30]
    expect(indices).not.toContain(2); // excludes self
  });

  it("excludes the target interval itself from results", () => {
    const search = buildSearch([
      { s: 0, e: 100 },
      { s: 10, e: 20 },
    ]);

    // Search for interval at index 0 ([0,100]) — should not return itself
    const results = search.findContainingIntervals(0, 100, 0);
    const selfIncluded = results.some((r) => r.index === 0);
    expect(selfIncluded).toBe(false);
  });

  it("returns empty array when no intervals contain the target", () => {
    const search = buildSearch([
      { s: 0, e: 5 },
      { s: 10, e: 15 },
      { s: 20, e: 25 },
    ]);

    // Target [0,25] is not contained by any single interval
    const results = search.findContainingIntervals(0, 25, -1);
    expect(results).toEqual([]);
  });

  it("handles exact boundary containment (start <= targetStart && end >= targetEnd)", () => {
    const search = buildSearch([
      { s: 10, e: 20 },
      { s: 10, e: 20 },
    ]);

    // Both intervals have same bounds; searching for index 0 should find index 1
    const results = search.findContainingIntervals(10, 20, 0);
    expect(results.some((r) => r.index === 1)).toBe(true);
  });

  it("works with a single interval", () => {
    const search = buildSearch([{ s: 0, e: 100 }]);

    // Target [10,20] is contained by [0,100]
    const results = search.findContainingIntervals(10, 20, -1);
    expect(results).toHaveLength(1);
    expect(results[0].start).toBe(0);
    expect(results[0].end).toBe(100);
  });

  it("handles nested intervals correctly", () => {
    // [0,100] contains [10,90] which contains [20,80]
    const search = buildSearch([
      { s: 0, e: 100 },
      { s: 10, e: 90 },
      { s: 20, e: 80 },
    ]);

    // [20,80] (index 2) should be contained by both [0,100] and [10,90]
    const results = search.findContainingIntervals(20, 80, 2);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty for empty tree", () => {
    const nodes = createIntervalNodes(
      [] as { s: number; e: number }[],
      (i) => i.s,
      (i) => i.e
    );
    const tree = new IntervalTree(nodes);
    const search = new ContainmentSearchAlgorithm(tree);

    const results = search.findContainingIntervals(0, 10, -1);
    expect(results).toEqual([]);
  });
});
