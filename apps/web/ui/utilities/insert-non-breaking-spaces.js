/**
 * Insert non-breaking spaces after small words in a string.
 *
 * @param {string} text - The string to insert non-breaking spaces into.
 * @returns {string} The string with non-breaking spaces inserted.
 */
const insertNonBreakingSpaces = (text) => {
  // Define the small words and articles.
  const smallWords = [
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "of",
    "with",
    "at",
    "from",
    "into",
    "during",
    "including",
    "until",
    "against",
    "among",
    "throughout",
    "despite",
    "towards",
    "upon",
    "concerning",
    "to",
    "in",
    "for",
    "on",
    "by",
    "about",
    "like",
    "through",
    "over",
    "before",
    "between",
    "after",
    "since",
    "without",
    "under",
    "within",
    "along",
    "following",
    "across",
    "behind",
    "beyond",
    "plus",
    "except",
    "but",
    "up",
    "out",
    "around",
    "down",
    "off",
    "above",
    "near",
  ];

  // Create a regular expression from the small words array.
  const regex = new RegExp(`\\b(${smallWords.join("|")})\\s`, "gi");

  // Replace the space after the small words with a non-breaking space.
  return text.replace(regex, (match) => `${match.trim()}\u00A0`);
};

export default insertNonBreakingSpaces;
