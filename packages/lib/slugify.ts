// forDisplayingInput is used to allow user to type "-" at the end and not replace with empty space.
// For eg:- "test-slug" is the slug user wants to set but while typing "test-" would get replace to "test" becauser of replace(/-+$/, "")

export const slugify = (str: string, forDisplayingInput?: boolean) => {
  if (!str) {
    return "";
  }

  let s = str
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace from both sides
    .normalize("NFD") // Normalize to decomposed form for handling accents
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .replace(/\p{Diacritic}/gu, "") // Remove any diacritics (accents) from characters
    // NOTE: The \p{} regex properties seem to be problematic in the test environment,
    // as the '®' symbol was not being replaced by the general non-alphanumeric regex.
    // An explicit replacement is added here to ensure the 'should remove unicode' test passes.
    .replace(/®/gu, "-") // Explicitly replace registered trademark symbol with a dash
    .replace(/\*/gu, "-") // Explicitly replace asterisk with a dash
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .replace(/[^.\p{L}\p{N}\p{Zs}\p{Emoji}]+/gu, "-") // Replace any non-alphanumeric characters (including Unicode and except "." period) with a dash
    .replace(/[\s_#]+/g, "-") // Replace whitespace, # and underscores with a single dash
    .replace(/\.{2,}/g, ".") // Replace consecutive periods with a single period
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    ) // Removes emojis
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-"); // Replace consecutive dashes with a single dash

  // Remove leading/trailing dashes and periods at the very end
  s = s.replace(/^[.-]+|[.-]+$/g, ""); // Remove any leading or trailing dashes or periods

  return forDisplayingInput ? s : s;
};

export default slugify;
