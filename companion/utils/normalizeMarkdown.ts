export const normalizeMarkdown = (text: string): string => {
  if (!text) return "";

  return (
    text
      // Remove HTML tags including <br>, <div>, <p>, etc.
      .replace(/<[^>]*>/g, " ")
      // Convert HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      // Convert markdown links [text](url) to just text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove bold/italic markers **text** or *text*
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      // Remove inline code `text`
      .replace(/`([^`]+)`/g, "$1")
      // Remove strikethrough ~~text~~
      .replace(/~~([^~]+)~~/g, "$1")
      // Remove heading markers # ## ###
      .replace(/^#{1,6}\s+/gm, "")
      // Remove blockquote markers >
      .replace(/^>\s+/gm, "")
      // Remove list markers - * +
      .replace(/^[\s]*[-*+]\s+/gm, "")
      // Remove numbered list markers 1. 2. etc
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Normalize multiple whitespace/newlines to single space
      .replace(/\s+/g, " ")
      // Trim whitespace
      .trim()
  );
};
