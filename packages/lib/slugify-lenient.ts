/**
 * Only applies minimal transformations to prevent blocking issues:
 * - Removes leading dashes (could break URL parsing)
 * - Removes leading periods (could break URL parsing)
 * - Removes leading underscores (could break URL parsing)
 * - Trims whitespace
 */
export const slugifyLenient = (str: string): string => {
  if (!str) {
    return "";
  }

  return str
    .trim() // Remove whitespace from both sides
    .replace(/^-+/, "") // Remove dashes from start
    .replace(/^\.+/, "") // Remove periods from start
    .replace(/^_+/, ""); // Remove underscores from start
};

export default slugifyLenient;
