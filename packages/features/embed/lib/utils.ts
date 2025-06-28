export const sanitizeHtmlId = (id: string) => {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-") // Replace invalid chars with hyphen
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
};
