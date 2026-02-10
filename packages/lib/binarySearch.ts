/**
 * Finds the index of the last element in a sorted array that is <= the given value
 * using binary search. Returns -1 if no such element exists.
 *
 * Useful for range-overlap checks: given sorted interval start times, find the
 * last interval that could possibly overlap a query point.
 */
export function binarySearchRangeIndex(sortedStarts: number[], value: number): number {
  let lo = 0;
  let hi = sortedStarts.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedStarts[mid] <= value) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}
