import removeMd from "remove-markdown";

/**
 * Strip markdown from text with optional newline preservation
 * @param md - Markdown text to strip
 * @param preserveNewlines - Whether to preserve newlines in the output
 * @returns Plain text with markdown removed
 */
export function stripMarkdown(md: string, preserveNewlines = false): string {
  if (!md) return "";
  
  // First remove markdown using the library
  let plainText = removeMd(md);
  
  // Remove HTML tags that might remain
  plainText = plainText.replace(/<\/?[^>]+(>|$)/g, "");
  
  if (preserveNewlines) {
    // Preserve newlines but clean up excessive whitespace
    plainText = plainText
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines to max 2
      .trim();
  } else {
    // Replace newlines with spaces and clean up whitespace
    plainText = plainText
      .replace(/\s+/g, " ") // Replace multiple whitespace with single space
      .replace(/_/g, " ") // Replace underscores with spaces
      .trim();
  }
  
  return plainText;
}

/**
 * Strip markdown while preserving newlines
 * @param md - Markdown text to strip
 * @returns Plain text with markdown removed but newlines preserved
 */
export function stripMarkdownPreserveNewlines(md: string): string {
  return stripMarkdown(md, true);
}
