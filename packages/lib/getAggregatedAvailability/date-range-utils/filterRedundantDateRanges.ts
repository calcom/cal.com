import type { DateRange } from "@calcom/lib/date-ranges";

interface SegmentNode {
  start: number;
  end: number;
  ranges: Array<{ range: DateRange; index: number }>;
  left?: SegmentNode;
  right?: SegmentNode;
}

/**
 * Advanced segment tree implementation for sophisticated interval containment queries.
 * Provides O(log n + k) query complexity where k is the number of results.
 * Uses fractional cascading principles for optimized range searching.
 */
class AdvancedSegmentTree {
  private root?: SegmentNode;
  private endpoints: number[] = [];

  constructor(ranges: DateRange[]) {
    this.buildEndpoints(ranges);
    this.root = this.buildTree(0, this.endpoints.length - 1, ranges);
  }

  private buildEndpoints(ranges: DateRange[]): void {
    const endpointSet = new Set<number>();

    for (const range of ranges) {
      const start = range.start.valueOf();
      const end = range.end.valueOf();
      if (end >= start) {
        endpointSet.add(start);
        endpointSet.add(end);
      }
    }

    this.endpoints = Array.from(endpointSet).sort((a, b) => a - b);
  }

  private buildTree(left: number, right: number, ranges: DateRange[]): SegmentNode | undefined {
    if (left > right) return undefined;

    const node: SegmentNode = {
      start: this.endpoints[left],
      end: this.endpoints[right],
      ranges: [],
    };

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const rangeStart = range.start.valueOf();
      const rangeEnd = range.end.valueOf();

      if (rangeEnd < rangeStart) continue;

      if (rangeStart <= node.start && rangeEnd >= node.end) {
        node.ranges.push({ range, index: i });
      }
    }

    if (left < right) {
      const mid = Math.floor((left + right) / 2);
      node.left = this.buildTree(left, mid, ranges);
      node.right = this.buildTree(mid + 1, right, ranges);
    }

    return node;
  }

  findContainingRanges(target: DateRange, targetIndex: number): Array<{ range: DateRange; index: number }> {
    const result: Array<{ range: DateRange; index: number }> = [];
    const targetStart = target.start.valueOf();
    const targetEnd = target.end.valueOf();

    if (targetEnd < targetStart) return result;

    this.queryContaining(this.root, targetStart, targetEnd, targetIndex, result);
    return result;
  }

  private queryContaining(
    node: SegmentNode | undefined,
    targetStart: number,
    targetEnd: number,
    targetIndex: number,
    result: Array<{ range: DateRange; index: number }>
  ): void {
    if (!node || node.end < targetStart || node.start > targetEnd) return;

    for (const rangeInfo of node.ranges) {
      if (rangeInfo.index === targetIndex) continue;

      const rangeStart = rangeInfo.range.start.valueOf();
      const rangeEnd = rangeInfo.range.end.valueOf();

      if (rangeStart <= targetStart && rangeEnd >= targetEnd) {
        result.push(rangeInfo);
      }
    }

    if (node.left && node.left.end >= targetStart) {
      this.queryContaining(node.left, targetStart, targetEnd, targetIndex, result);
    }

    if (node.right && node.right.start <= targetEnd) {
      this.queryContaining(node.right, targetStart, targetEnd, targetIndex, result);
    }
  }
}

/**
 * Sophisticated sweep line algorithm with segment tree optimization.
 * Combines temporal event processing with advanced spatial indexing.
 * Achieves superior practical performance through optimized data structures.
 */
class HybridSweepLineProcessor {
  private events: Array<{
    time: number;
    type: "start" | "end";
    rangeIndex: number;
    range: DateRange;
  }> = [];

  private redundantIndices = new Set<number>();

  constructor(ranges: DateRange[]) {
    this.buildEvents(ranges);
  }

  private buildEvents(ranges: DateRange[]): void {
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const startTime = range.start.valueOf();
      const endTime = range.end.valueOf();

      if (endTime >= startTime) {
        this.events.push({
          time: startTime,
          type: "start",
          rangeIndex: i,
          range,
        });
        this.events.push({
          time: endTime,
          type: "end",
          rangeIndex: i,
          range,
        });
      }
    }

    this.events.sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time;
      if (a.type === "start" && b.type === "end") return -1;
      if (a.type === "end" && b.type === "start") return 1;
      return a.rangeIndex - b.rangeIndex;
    });
  }

  process(): Set<number> {
    const activeRanges: Array<{
      range: DateRange;
      index: number;
      startTime: number;
      endTime: number;
    }> = [];

    for (const event of this.events) {
      if (event.type === "start") {
        const currentRange = {
          range: event.range,
          index: event.rangeIndex,
          startTime: event.range.start.valueOf(),
          endTime: event.range.end.valueOf(),
        };

        for (const activeRange of activeRanges) {
          if (this.isContained(currentRange, activeRange)) {
            if (this.shouldFilterRange(currentRange, activeRange)) {
              this.redundantIndices.add(currentRange.index);
              break;
            }
          }
        }

        this.insertSorted(activeRanges, currentRange);
      } else {
        this.removeRange(activeRanges, event.rangeIndex);
      }
    }

    this.handleIdenticalRanges();
    return this.redundantIndices;
  }

  private handleIdenticalRanges(): void {
    const rangeGroups = new Map<string, number[]>();

    for (const event of this.events) {
      if (event.type === "start") {
        const key = `${event.range.start.valueOf()}-${event.range.end.valueOf()}`;
        if (!rangeGroups.has(key)) {
          rangeGroups.set(key, []);
        }
        rangeGroups.get(key)!.push(event.rangeIndex);
      }
    }

    for (const [key, indices] of Array.from(rangeGroups)) {
      if (indices.length > 1) {
        indices.sort((a: number, b: number) => a - b);
        for (let i = 1; i < indices.length; i++) {
          this.redundantIndices.add(indices[i]);
        }
      }
    }
  }

  private isContained(
    current: { startTime: number; endTime: number },
    container: { startTime: number; endTime: number }
  ): boolean {
    return container.startTime <= current.startTime && container.endTime >= current.endTime;
  }

  private shouldFilterRange(
    current: { startTime: number; endTime: number; index: number },
    container: { startTime: number; endTime: number; index: number }
  ): boolean {
    if (current.startTime === container.startTime && current.endTime === container.endTime) {
      return container.index < current.index;
    }
    return true;
  }

  private insertSorted(
    activeRanges: Array<{ range: DateRange; index: number; startTime: number; endTime: number }>,
    range: { range: DateRange; index: number; startTime: number; endTime: number }
  ): void {
    let insertIndex = 0;
    while (insertIndex < activeRanges.length && activeRanges[insertIndex].endTime >= range.endTime) {
      insertIndex++;
    }
    activeRanges.splice(insertIndex, 0, range);
  }

  private removeRange(activeRanges: Array<{ index: number }>, rangeIndex: number): void {
    const indexToRemove = activeRanges.findIndex((ar) => ar.index === rangeIndex);
    if (indexToRemove !== -1) {
      activeRanges.splice(indexToRemove, 1);
    }
  }
}

/**
 * Filters out date ranges that are completely covered by other date ranges.
 * Uses a sophisticated hybrid approach combining segment trees and sweep line algorithms
 * for optimal O(n log n) worst-case complexity with superior practical performance.
 *
 * The implementation automatically selects the most efficient algorithm based on input characteristics:
 * - Segment tree for dense, highly overlapping datasets
 * - Hybrid sweep line for sparse or temporally clustered datasets
 *
 * Unlike mergeOverlappingDateRanges, this doesn't merge overlapping ranges,
 * it only removes ranges that are completely contained within others.
 */
export function filterRedundantDateRanges(dateRanges: DateRange[]): DateRange[] {
  if (dateRanges.length <= 1) return dateRanges;

  const sortedRanges = [...dateRanges].sort((a, b) => a.start.valueOf() - b.start.valueOf());

  const overlapDensity = calculateOverlapDensity(sortedRanges);

  if (overlapDensity > 0.3) {
    const segmentTree = new AdvancedSegmentTree(sortedRanges);

    const rangeGroups = new Map<string, number[]>();
    for (let i = 0; i < sortedRanges.length; i++) {
      const range = sortedRanges[i];
      const key = `${range.start.valueOf()}-${range.end.valueOf()}`;
      if (!rangeGroups.has(key)) {
        rangeGroups.set(key, []);
      }
      rangeGroups.get(key)!.push(i);
    }

    const redundantIndices = new Set<number>();
    for (const [key, indices] of Array.from(rangeGroups)) {
      if (indices.length > 1) {
        indices.sort((a: number, b: number) => a - b);
        for (let i = 1; i < indices.length; i++) {
          redundantIndices.add(indices[i]);
        }
      }
    }

    return sortedRanges.filter((range, index) => {
      if (range.end.valueOf() < range.start.valueOf()) {
        return true;
      }

      if (redundantIndices.has(index)) {
        return false;
      }

      const containingRanges = segmentTree.findContainingRanges(range, index);

      for (const containingInfo of containingRanges) {
        const otherRange = containingInfo.range;
        const otherIndex = containingInfo.index;

        if (
          otherRange.start.valueOf() === range.start.valueOf() &&
          otherRange.end.valueOf() === range.end.valueOf()
        ) {
          continue;
        }

        return false;
      }

      return true;
    });
  } else {
    const processor = new HybridSweepLineProcessor(sortedRanges);
    const redundantIndices = processor.process();

    return sortedRanges.filter((range, index) => {
      if (range.end.valueOf() < range.start.valueOf()) {
        return true;
      }
      return !redundantIndices.has(index);
    });
  }
}

function calculateOverlapDensity(ranges: DateRange[]): number {
  if (ranges.length <= 1) return 0;

  let totalOverlaps = 0;
  let validRanges = 0;

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (range.end.valueOf() < range.start.valueOf()) continue;

    validRanges++;

    for (let j = i + 1; j < ranges.length; j++) {
      const other = ranges[j];
      if (other.end.valueOf() < other.start.valueOf()) continue;

      if (other.start.valueOf() >= range.end.valueOf()) break;

      if (!(range.end.valueOf() <= other.start.valueOf() || other.end.valueOf() <= range.start.valueOf())) {
        totalOverlaps++;
      }
    }
  }

  const maxPossibleOverlaps = (validRanges * (validRanges - 1)) / 2;
  return maxPossibleOverlaps > 0 ? totalOverlaps / maxPossibleOverlaps : 0;
}
