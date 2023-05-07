export const slugify = (str: string) => {
  return str.replace(/[^a-zA-Z0-9-\p{Emoji}]/gu, "-").toLowerCase();
};

export default slugify;
