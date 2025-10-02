// apps/web/lib/sanitizeUsername.ts
export const sanitizeUsername = (username: string): string => {
  if (!username) return "";

  return username
    .replace(/^https?:\/\//i, "") // Remove any URL scheme (http, https)
    .replace(/[^a-zA-Z0-9-_.+*]/g, "") // Remove invalid characters
    .toLowerCase(); // Convert to lowercase
};
