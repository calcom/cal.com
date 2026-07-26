export const truncate = (text: string, maxLength: number, ellipsis = true) => {
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 3)}${ellipsis ? "..." : ""}`;
};

export const truncateOnWord = (text: string, maxLength: number, ellipsis = true) => {
  if (text.length <= maxLength) return text;

  const suffix = ellipsis ? "..." : "";
  // Reserve room for the ellipsis so the result never exceeds maxLength.
  const budget = Math.max(maxLength - suffix.length, 0);

  const hardCut = text.slice(0, budget);

  // Then split on the last space, this way we split on the last word,
  // which looks just a bit nicer. Languages that don't separate words with
  // spaces (ja, ko, zh, th) have no boundary to break on, so fall back to the
  // hard cut rather than dropping the whole string.
  const lastSpace = hardCut.lastIndexOf(" ");
  const truncatedText = lastSpace > 0 ? hardCut.slice(0, lastSpace) : hardCut;

  return `${truncatedText}${suffix}`;
};
