export const slugify = (str: string) => {
  return str
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace from both sides
    .normalize("NFD") // Normalize to decomposed form for handling accents
    .replace(/\p{Diacritic}/gu, "") // Remove any diacritics (accents) from characters
    .replace(/[^\p{L}\p{N}\p{Zs}\p{Emoji}]+/gu, "-") // Replace any non-alphanumeric characters (including Unicode) with a dash
    .replace(/[\s_]+/g, "-") // Replace whitespace and underscores with a single dash
    .replace(/^-+/, "") // Remove dashes from start
    .replace(/-+$/, ""); // Remove dashes from end
};

export default slugify;
