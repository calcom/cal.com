// apps/web/lib/sanitizeUsername.ts
export const sanitizeUsername = (username: string) => {
  if (!username) return "";

  // Remove any URL scheme (http, https)
  username = username.replace(/^https?:\/\//i, "");

  // Remove any slashes, spaces, or other invalid characters
  username = username.replace(/[^a-zA-Z0-9-_+]/g, "");

  // Convert to lowercase
  username = username.toLowerCase();

  return username;
};
