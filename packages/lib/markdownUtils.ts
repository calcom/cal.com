/**
 * Strips markdown syntax from text, returning plain text
 * Used for calendar invites (ICS files) where markdown shouldn't be rendered
 */
export function stripMarkdown(text: string | undefined | null): string {
  if (!text) return "";

  return (
    text
      // Remove HTML tags first
      .replace(/<\/?[^>]+(>|$)/g, "")
      // Remove bold (4+ asterisks) - for ****text**** or more
      .replace(/\*{4,}([^*]+)\*{4,}/g, "$1")
      // Remove bold/italic (2-3 asterisks) - for **text** or ***text***
      .replace(/\*{2,3}([^*]+)\*{2,3}/g, "$1")
      // Remove italic (1 asterisk) - for *text*
      .replace(/\*([^*]+)\*/g, "$1")
      // Remove links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove headers
      .replace(/#{1,6}\s+(.+)/g, "$1")
      // Replace underscores with spaces
      .replace(/_/g, " ")
      // Remove extra whitespace
      .trim()
  );
}

/**
 * Converts markdown to HTML for email rendering
 * Used in email templates where we want formatted text
 */
export function markdownToHtml(text: string | undefined | null): string {
  if (!text) return "";

  return (
    text
      // Convert 4+ asterisks to strong
      .replace(/\*{4,}([^*]+)\*{4,}/g, "<strong>$1</strong>")
      // Convert 3 asterisks to strong+em
      .replace(/\*{3}([^*]+)\*{3}/g, "<strong><em>$1</em></strong>")
      // Convert 2 asterisks to strong
      .replace(/\*{2}([^*]+)\*{2}/g, "<strong>$1</strong>")
      // Convert 1 asterisk to em
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      // Convert links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Convert line breaks
      .replace(/\n/g, "<br>")
  );
}
