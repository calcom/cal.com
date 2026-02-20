export default function wordTruncate(text: string, maxLength = 40) {
  if (text.length <= maxLength + 3 /* exclude ellipsis when comparing original text length */) {
    return text;
  }

  // Check if text contains spaces or hyphens
  const hasSpaces = text.includes(" ");
  const hasHyphens = text.includes("-");

  if (!hasSpaces && !hasHyphens) {
    // No delimiters, just truncate by character count
    return `${text.slice(0, maxLength)}...`;
  }

  // Determine delimiter (prioritize spaces over hyphens)
  const delimiter = hasSpaces ? " " : "-";

  // Split by delimiter and build truncated string word by word
  const words = text.split(delimiter);
  let result = "";

  for (let i = 0; i < words.length; i++) {
    const candidate = i === 0 ? words[i] : result + delimiter + words[i];

    if (candidate.length > maxLength) {
      break;
    }
    result = candidate;
  }

  // If we couldn't fit even the first word, truncate by character
  if (!result) {
    return `${text.slice(0, maxLength)}...`;
  }

  // Remove trailing delimiter and any non-alphabetic characters at the end
  result = result.replace(/[^a-zA-Z]+$/, "");

  // Remove leading non-alphabetic characters at the beginning
  result = result.replace(/^[^a-zA-Z]+/, "");

  return `${result}...`;
}
