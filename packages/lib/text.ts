const ELLIPSIS = "...";

export const truncate = (text: string, maxLength: number, ellipsis = true) => {
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 3)}${ellipsis ? "..." : ""}`;
};

export const truncateOnWord = (text: string, maxLength: number, ellipsis = true) => {
  if (text.length <= maxLength) return text;

  if (maxLength <= 0) return "";

  // Only spend characters on the ellipsis if it leaves room for actual text.
  const suffix = ellipsis && maxLength > ELLIPSIS.length ? ELLIPSIS : "";
  const budget = maxLength - suffix.length;

  const hardCut = text.slice(0, budget);

  // Prefer breaking at a complete word, but keep the text when there is no word
  // boundary to break on — languages that don't separate words with spaces
  // (ja, ko, zh, th) would otherwise lose the whole string.
  const lastSpace = hardCut.lastIndexOf(" ");
  const truncatedText = lastSpace > 0 ? hardCut.slice(0, lastSpace) : hardCut;

  return `${truncatedText}${suffix}`;
};
