/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Uses the browser's built-in text encoding via textContent.
 */
export function escapeHtml(text: string): string {
  if (typeof text !== "string") return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
