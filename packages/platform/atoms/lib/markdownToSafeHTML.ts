import DOMPurify from "dompurify";
import { marked } from "marked";

export function markdownToSafeHTML(markdown: string | null) {
  if (!markdown) return "";
  marked.use({ async: false });
  const parsedMd = marked.parse(markdown) as string;
  return DOMPurify.sanitize(parsedMd);
}
