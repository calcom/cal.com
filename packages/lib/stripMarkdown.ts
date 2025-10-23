import removeMd from "remove-markdown";

export function stripMarkdown(md: string): string {
  if (!md) return "";
  let stripped = removeMd(md);
  stripped = stripped.replace(/[*_~`#>]+/g, " ");
  stripped = stripped.replace(/\s{2,}/g, " ");
  stripped = stripped.replace(/\r\n/g, "\n");
  return stripped.trim();
}
