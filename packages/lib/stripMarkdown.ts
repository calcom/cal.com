import removeMd from "remove-markdown";

export function stripMarkdown(md: string) {
  return removeMd(md);
}
