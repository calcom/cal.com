import type { DateRange } from "@calcom/lib/date-ranges";

interface IntervalNode {
  range: DateRange;
  index: number;
  maxEnd: number;
  left?: IntervalNode;
  right?: IntervalNode;
}

class IntervalTree {
  private root?: IntervalNode;

  constructor(ranges: DateRange[]) {
    const nodes = ranges.map((range, index) => ({
      range,
      index,
      maxEnd: range.end.valueOf(),
    }));
    this.root = this.buildTree(nodes.sort((a, b) => a.range.start.valueOf() - b.range.start.valueOf()));
  }

  private buildTree(nodes: IntervalNode[]): IntervalNode | undefined {
    if (nodes.length === 0) return undefined;

    const mid = Math.floor(nodes.length / 2);
    const node = nodes[mid];

    const leftNodes = nodes.slice(0, mid);
    const rightNodes = nodes.slice(mid + 1);

    node.left = this.buildTree(leftNodes);
    node.right = this.buildTree(rightNodes);

    node.maxEnd = Math.max(node.range.end.valueOf(), node.left?.maxEnd ?? 0, node.right?.maxEnd ?? 0);

    return node;
  }

  findContainingIntervals(target: DateRange, targetIndex: number): IntervalNode[] {
    const result: IntervalNode[] = [];
    this.searchContaining(this.root, target, targetIndex, result);
    return result;
  }

  private searchContaining(
    node: IntervalNode | undefined,
    target: DateRange,
    targetIndex: number,
    result: IntervalNode[]
  ): void {
    if (!node) return;

    if (node.range.end.valueOf() < node.range.start.valueOf()) {
      this.searchContaining(node.left, target, targetIndex, result);
      this.searchContaining(node.right, target, targetIndex, result);
      return;
    }

    if (
      node.range.start.valueOf() <= target.start.valueOf() &&
      node.range.end.valueOf() >= target.end.valueOf() &&
      node.index !== targetIndex
    ) {
      result.push(node);
    }

    if (node.left && node.left.maxEnd >= target.start.valueOf()) {
      this.searchContaining(node.left, target, targetIndex, result);
    }

    if (node.right && node.range.start.valueOf() <= target.end.valueOf()) {
      this.searchContaining(node.right, target, targetIndex, result);
    }
  }
}

/**
 * Filters out date ranges that are completely covered by other date ranges.
 * Uses an interval tree for O(n log n) worst-case complexity.
 * Unlike mergeOverlappingDateRanges, this doesn't merge overlapping ranges,
 * it only removes ranges that are completely contained within others.
 */
export function filterRedundantDateRanges(dateRanges: DateRange[]): DateRange[] {
  if (dateRanges.length <= 1) return dateRanges;

  const sortedRanges = [...dateRanges].sort((a, b) => a.start.valueOf() - b.start.valueOf());
  const intervalTree = new IntervalTree(sortedRanges);

  return sortedRanges.filter((range, index) => {
    if (range.end.valueOf() < range.start.valueOf()) {
      return true;
    }

    const containingIntervals = intervalTree.findContainingIntervals(range, index);

    // If any containing interval is found, filter out this range
    if (containingIntervals.length > 0) {
      return false;
    }

    return true; // Keep this range
  });
}
