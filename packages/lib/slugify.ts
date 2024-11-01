// forDisplayingInput is used to allow user to type "-" at the end and not replace with empty space.
// For eg:- "test-slug" is the slug user wants to set but while typing "test-" would get replace to "test" becauser of replace(/-+$/, "")

export const slugify = (str: string, forDisplayingInput?: boolean) => {
  if (!str) {
    return "";
  }

  const s = str
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace from both sides
    .normalize("NFD") // Normalize to decomposed form for handling accents
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (accents)
    .replace(/[^.\w\s\u00C0-\u024F\u1E00-\u1EFF]+/g, "-") // Replace non-alphanumeric characters (excluding period) with a dash
    .replace(/[\s_#]+/g, "-") // Replace whitespace, underscores, and # with a single dash
    .replace(/^-+/, "") // Remove leading dashes
    .replace(/\.{2,}/g, ".") // Replace consecutive periods with a single period
    .replace(/^\.+/, "") // Remove leading periods
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    ) // Remove emojis
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .replace(/-+/g, "-"); // Replace consecutive dashes with a single dash

  return forDisplayingInput ? s : s.replace(/-+$/, "").replace(/\.*$/, "");
};

export default slugify;
