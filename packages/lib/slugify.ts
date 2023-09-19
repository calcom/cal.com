// forDisplayingInput is used to allow user to type "-" at the end and not replace with empty space.
// For eg:- "test-slug" is the slug user wants to set but while typing "test-" would get replace to "test" becauser of replace(/-+$/, "")

export const slugify = (str: string, forDisplayingInput?: boolean) => {
  const s = str
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace from both sides
    .normalize("NFD") // Normalize to decomposed form for handling accents
    .replace(/\p{Diacritic}/gu, "") // Remove any diacritics (accents) from characters
    .replace(/[^\p{L}\p{N}\p{Zs}\p{Emoji}]+/gu, "-") // Replace any non-alphanumeric characters (including Unicode) with a dash
    .replace(/[\s_#]+/g, "-") // Replace whitespace, # and underscores with a single dash
    .replace(/^-+/, ""); // Remove dashes from start

  return forDisplayingInput ? s : s.replace(/-+$/, ""); // Remove dashes from end
};

export default slugify;
