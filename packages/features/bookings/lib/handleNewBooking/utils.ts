export function assertNonEmptyArray<T>(arr: T[]): asserts arr is [T, ...T[]] {
  if (arr.length === 0) {
    throw new Error("Array should have at least one item, but it's empty");
  }
}
