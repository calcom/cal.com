export const sanitizeUsername = (username: string | null | undefined): string => {
  if (!username) return "";

  return username
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9-_.+*]/g, "")
    .toLowerCase();
};
