export default function wordTruncate(text: string, maxLength = 40) {
  if (text.length <= maxLength) {
    return text;
  }

  const ellipsis = "...";
  const allowedLength = maxLength - ellipsis.length;

  const hasSpaces = text.includes(" ");
  const hasHyphens = text.includes("-");

  if (!hasSpaces && !hasHyphens) {
    return text.slice(0, allowedLength) + ellipsis;
  }

  const delimiter = hasSpaces ? " " : "-";
  const words = text.split(delimiter);

  let result = "";

  for (let i = 0; i < words.length; i++) {
    const candidate = i === 0 ? words[i] : result + delimiter + words[i];

    if (candidate.length > allowedLength) {
      break;
    }

    result = candidate;
  }

  if (!result) {
    return text.slice(0, allowedLength) + ellipsis;
  }

  return result + ellipsis;
}
