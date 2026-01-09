export interface RatingOption {
  value: number;
  emoji: string;
}

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const DEFAULT_RATING = 3;

export const RATING_OPTIONS: RatingOption[] = [
  { value: 1, emoji: "😠" },
  { value: 2, emoji: "🙁" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "😄" },
  { value: 5, emoji: "😍" },
];

/**
 * Validates and normalizes a rating value to ensure it's within the valid range
 * @param rating - The rating value to validate (can be string or number)
 * @param defaultValue - The default value to use if rating is invalid (defaults to DEFAULT_RATING)
 * @returns A valid rating number between MIN_RATING and MAX_RATING
 */
export function validateRating(
  rating: string | number | null | undefined,
  defaultValue = DEFAULT_RATING
): number {
  const parsedRating = typeof rating === "string" ? parseInt(rating, 10) : rating;

  if (!parsedRating || isNaN(parsedRating)) {
    return defaultValue;
  }

  if (parsedRating > MAX_RATING) return MAX_RATING;
  if (parsedRating < MIN_RATING) return MIN_RATING;

  return parsedRating;
}

/**
 * Gets the emoji for a given rating value
 * @param rating - The rating value
 * @returns The corresponding emoji or empty string if not found
 */
export function getRatingEmoji(rating: number): string {
  const option = RATING_OPTIONS.find((opt) => opt.value === rating);
  return option?.emoji || "";
}
