import { describe, expect, it } from "vitest";
import { ContainmentSearchAlgorithm, createIntervalNodes, IntervalTree } from "./intervalTree";

describe("createIntervalNodes", () => {
  it("creates nodes from items with correct start/end/index", () => {
    const items = [
      { from: 0, to: 10 },
      { from: 5, to: 15 },
    ];
    const nodes = createIntervalNodes(
      items,
      (i) => i.from,
      (i) => i.to
    );

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ item: items[0], index: 0, start: 0, end: 10, maxEnd: 10 });
    expect(nodes[1]).toMatchObject({ item: items[1], index: 1, start: 5, end: 15, maxEnd: 15 });
  });

  it("returns empty array for empty input", () => {
    const nodes = createIntervalNodes(
      [],
      () => 0,
      () => 0
    );
    expect(nodes).toHaveLength(0);
  });
});

describe("IntervalTree", () => {
  it("builds a tree and returns root", () => {
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

  it("computes maxEnd correctly across children", () => {
    const nodes = createIntervalNodes(
      [
        { s: 0, e: 5 },
        { s: 1, e: 20 },
        { s: 10, e: 15 },
      ],
      (i) => i.s,
      (i) => i.e
    );
    const tree = new IntervalTree(nodes);
    const root = tree.getRoot();
    expect(root?.maxEnd).toBe(20);
  });
});

describe("ContainmentSearchAlgorithm", () => {
  it("finds intervals that fully contain the target", () => {
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

  it("returns empty array when no interval contains the target", () => {
    const nodes = createIntervalNodes(
      [
        { s: 0, e: 5 },
        { s: 10, e: 15 },
      ],
      (i) => i.s,
      (i) => i.e
    );
    const tree = new IntervalTree(nodes);
    const search = new ContainmentSearchAlgorithm(tree);

    const results = search.findContainingIntervals(6, 9, -1);
    expect(results).toHaveLength(0);
  });

  it("returns empty for empty tree", () => {
    const tree = new IntervalTree([]);
    const search = new ContainmentSearchAlgorithm(tree);
    const results = search.findContainingIntervals(0, 10, -1);
    expect(results).toHaveLength(0);
  });

  it("handles exact boundary matches", () => {
    const nodes = createIntervalNodes(
      [
        { s: 0, e: 10 },
        { s: 0, e: 10 },
      ],
      (i) => i.s,
      (i) => i.e
    );
    const tree = new IntervalTree(nodes);
    const search = new ContainmentSearchAlgorithm(tree);

    // [0,10] at index 0 should find [0,10] at index 1 (same boundaries, different index)
    const results = search.findContainingIntervals(0, 10, 0);
    expect(results.some((r) => r.index === 1)).toBe(true);
  });
});
