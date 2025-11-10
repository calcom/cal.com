import removeMd from "remove-markdown";

export function stripMarkdown(
  md: string | null | undefined,
  options?: { preserveNewlines?: boolean }
): string {
  if (!md) return "";

  if (options?.preserveNewlines) {
    // Use highly unique tokens that won't be affected by markdown cleanup
    const PAR_TOKEN = "XXXCALPARABREAKXXX";
    const LINE_TOKEN = "XXXCALLINEBREAKXXX";

    // Normalize line endings and preserve structure with tokens
    const withPlaceholders = md
      .replace(/\r\n/g, "\n")
      .replace(/\n{2,}/g, PAR_TOKEN)
      .replace(/\n/g, LINE_TOKEN);

    // Remove markdown syntax using the library
    let stripped = removeMd(withPlaceholders);

    // Additional cleanup for any remaining markdown artifacts
    stripped = stripped.replace(/\\/g, ""); // Remove escape characters
    stripped = stripped.replace(/[*_~`#>]{1,}/g, " "); // Remove any remaining markdown syntax
    stripped = stripped.replace(/[[\]]/g, " "); // Remove brackets from links

    // Restore newlines
    stripped = stripped
      .replace(new RegExp(PAR_TOKEN, "g"), "\n\n")
      .replace(new RegExp(LINE_TOKEN, "g"), "\n");

    // Clean up excessive whitespace
    stripped = stripped
      .replace(/[ \t]{2,}/g, " ") // Collapse spaces
      .replace(/\n{3,}/g, "\n\n") // Limit newlines
      .trim();

    return stripped;
  }

  // Without preserving newlines, collapse to single-line readable text
  let stripped = removeMd(md);

  // Clean up any remaining markdown artifacts
  stripped = stripped
    .replace(/\\/g, "") // Remove escape characters
    .replace(/[*_~`#>]{1,}/g, " ") // Remove markdown syntax
    .replace(/[[\]]/g, " ") // Remove brackets
    .replace(/\s{2,}/g, " ") // Collapse whitespace
    .replace(/\r\n/g, "\n") // Normalize line endings
    .trim();

  return stripped;
}
