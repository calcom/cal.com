import removeMd from "remove-markdown";

export function stripMarkdown(
  md: string | null | undefined,
  options?: { preserveNewlines?: boolean }
): string {
  if (!md) return "";

  if (options?.preserveNewlines) {
    const PAR_TOKEN = "CALPARABREAK9F8B";
    const LINE_TOKEN = "CALLINEBREAK9F8B";

    const withPlaceholders = md
      .replace(/\r\n/g, "\n")
      .replace(/\n{2,}/g, PAR_TOKEN)
      .replace(/\n/g, LINE_TOKEN);

    let stripped = removeMd(withPlaceholders);

    stripped = stripped.replace(/\\/g, "");

    stripped = stripped.replace(/[*_~`#>]+/g, "");

    stripped = stripped
      .replace(new RegExp(PAR_TOKEN, "g"), "\n\n")
      .replace(new RegExp(LINE_TOKEN, "g"), "\n");

    stripped = stripped.replace(/[ \t]{2,}/g, " ").trim();
    return stripped;
  }
  let stripped = removeMd(md);
  stripped = stripped.replace(/[*_~`#>]+/g, " ");
  stripped = stripped.replace(/\s{2,}/g, " ");
  stripped = stripped.replace(/\r\n/g, "\n");
  return stripped.trim();
}
