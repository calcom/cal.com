export const truncate = (text: string, maxLength: number, ellipsis = true) => {
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 3)}${ellipsis ? "..." : ""}`;
};

export const truncateOnWord = (text: string, maxLength: number, ellipsis = true) => {
  if (text.length <= maxLength) return text;

  const ellipsisLength = ellipsis ? 3 : 0;
  let truncatedText = text.substring(0, maxLength - ellipsisLength);

  // Split on the last word boundary for a cleaner result.
  // Fall back to the hard character cut when no space is present (CJK, URLs, etc.)
  const lastSpace = truncatedText.lastIndexOf(" ");
  if (lastSpace > 0) {
    truncatedText = truncatedText.substring(0, lastSpace);
  }

  return ellipsis ? truncatedText + "..." : truncatedText;
};
