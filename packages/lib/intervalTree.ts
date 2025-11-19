export interface IntervalNode<T> {
  item: T;
  index: number;
  start: number;
  end: number;
  maxEnd: number;
  left?: IntervalNode<T>;
  right?: IntervalNode<T>;
}

export function createIntervalNodes<T>(
  items: T[],
  getStart: (item: T) => number,
  getEnd: (item: T) => number
): IntervalNode<T>[] {
  return items.map((item, index) => ({
    item,
    index,
    start: getStart(item),
    end: getEnd(item),
    maxEnd: getEnd(item),
  }));
}

export class IntervalTree<T> {
  private root?: IntervalNode<T>;

  constructor(nodes: IntervalNode<T>[]) {
    this.root = this.buildTree([...nodes]);
  }

  private buildTree(nodes: IntervalNode<T>[]): IntervalNode<T> | undefined {
    if (nodes.length === 0) return undefined;

    const mid = Math.floor(nodes.length / 2);
    const node = nodes[mid];

    const leftNodes = nodes.slice(0, mid);
    const rightNodes = nodes.slice(mid + 1);

    node.left = this.buildTree(leftNodes);
    node.right = this.buildTree(rightNodes);

    node.maxEnd = Math.max(node.end, node.left?.maxEnd ?? 0, node.right?.maxEnd ?? 0);

    return node;
  }

  getRoot(): IntervalNode<T> | undefined {
    return this.root;
  }
}

export class ContainmentSearchAlgorithm<T> {
  private tree: IntervalTree<T>;

  constructor(tree: IntervalTree<T>) {
    this.tree = tree;
  }

  findContainingIntervals(targetStart: number, targetEnd: number, targetIndex: number): IntervalNode<T>[] {
    const result: IntervalNode<T>[] = [];
    this.searchContaining(this.tree.getRoot(), targetStart, targetEnd, targetIndex, result);
    return result;
  }

  private searchContaining(
    node: IntervalNode<T> | undefined,
    targetStart: number,
    targetEnd: number,
    targetIndex: number,
    result: IntervalNode<T>[]
  ): void {
    if (!node) return;

    if (node.end < node.start) {
      this.searchContaining(node.left, targetStart, targetEnd, targetIndex, result);
      this.searchContaining(node.right, targetStart, targetEnd, targetIndex, result);
      return;
    }

    if (node.start <= targetStart && node.end >= targetEnd && node.index !== targetIndex) {
      result.push(node);
    }

    if (node.left && node.left.maxEnd >= targetStart) {
      this.searchContaining(node.left, targetStart, targetEnd, targetIndex, result);
    }

    if (node.right && node.start <= targetEnd) {
      this.searchContaining(node.right, targetStart, targetEnd, targetIndex, result);
    }
  }
}
