type ListTag = "ul" | "ol";

type ListTagMatch = {
  start: number;
  tag: ListTag;
  attrs: string;
  inner: string;
  end: number;
};

function findNextListTag(html: string, from: number): ListTagMatch | null {
  const ulIdx = html.indexOf("<ul", from);
  const olIdx = html.indexOf("<ol", from);

  if (ulIdx === -1 && olIdx === -1) {
    return null;
  }

  let start: number;
  let tag: ListTag;

  if (ulIdx !== -1 && (olIdx === -1 || ulIdx < olIdx)) {
    start = ulIdx;
    tag = "ul";
  } else {
    start = olIdx;
    tag = "ol";
  }

  const openEnd = html.indexOf(">", start);
  if (openEnd === -1) {
    return null;
  }

  const attrs = html.slice(start + tag.length + 1, openEnd);
  const closeTag = `</${tag}>`;
  let depth = 1;
  let pos = openEnd + 1;

  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf(`<${tag}`, pos);
    const nextClose = html.indexOf(closeTag, pos);

    if (nextClose === -1) {
      return null;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      const tagClose = html.indexOf(">", nextOpen);
      if (tagClose === -1) {
        return null;
      }
      pos = tagClose + 1;
    } else {
      depth--;
      if (depth === 0) {
        return {
          start,
          tag,
          attrs,
          inner: html.slice(openEnd + 1, nextClose),
          end: nextClose + closeTag.length,
        };
      }
      pos = nextClose + closeTag.length;
    }
  }

  return null;
}

function findClosingLiTag(html: string, liOpenStart: number): number {
  const openEnd = html.indexOf(">", liOpenStart);
  if (openEnd === -1) {
    return html.length;
  }

  let depth = 1;
  let pos = openEnd + 1;

  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf("<li", pos);
    const nextClose = html.indexOf("</li>", pos);

    if (nextClose === -1) {
      return html.length;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      const tagClose = html.indexOf(">", nextOpen);
      if (tagClose === -1) {
        return html.length;
      }
      pos = tagClose + 1;
    } else {
      depth--;
      if (depth === 0) {
        return nextClose + "</li>".length;
      }
      pos = nextClose + "</li>".length;
    }
  }

  return html.length;
}

function splitTopLevelLiElements(html: string): string[] {
  const items: string[] = [];
  let i = 0;

  while (i < html.length) {
    const liStart = html.indexOf("<li", i);
    if (liStart === -1) {
      break;
    }

    const liEnd = findClosingLiTag(html, liStart);
    items.push(html.slice(liStart, liEnd));
    i = liEnd;
  }

  return items;
}

function isOrphanUlOnlyLi(liHtml: string): boolean {
  return /^<li[^>]*>\s*<ul[^>]*>[\s\S]*<\/ul>\s*<\/li>$/i.test(liHtml.trim());
}

function extractSingleUlFromLi(liHtml: string): string {
  const match = liHtml.trim().match(/^<li[^>]*>\s*(<ul[^>]*>[\s\S]*<\/ul>)\s*<\/li>$/i);
  return match?.[1] ?? "";
}

function mergeSiblingLiPairs(listInner: string): string {
  const items = splitTopLevelLiElements(listInner);
  const merged: string[] = [];
  let index = 0;

  while (index < items.length) {
    let current = items[index];
    index += 1;

    if (!isOrphanUlOnlyLi(current)) {
      while (index < items.length && isOrphanUlOnlyLi(items[index])) {
        const ulBlock = extractSingleUlFromLi(items[index]);
        current = current.replace(/<\/li>\s*$/i, `${ulBlock}</li>`);
        index += 1;
      }
    }

    merged.push(current);
  }

  return merged.join("");
}

/**
 * Merge orphaned nested lists produced by markdown-it:
 * `<li>text</li><li><ul>...</ul></li>` → `<li>text<ul>...</ul></li>`
 */
export function mergeOrphanedNestedLists(html: string): string {
  let result = "";
  let index = 0;

  while (index < html.length) {
    const listTag = findNextListTag(html, index);

    if (!listTag) {
      result += html.slice(index);
      break;
    }

    result += html.slice(index, listTag.start);
    const processedInner = mergeSiblingLiPairs(mergeOrphanedNestedLists(listTag.inner));
    result += `<${listTag.tag}${listTag.attrs}>${processedInner}</${listTag.tag}>`;
    index = listTag.end;
  }

  return result;
}

export function applyListFormatting(safeHTML: string): string {
  let html = mergeOrphanedNestedLists(safeHTML);

  html = html
    .replace(
      /<ul([^>]*)>/g,
      "<ul$1 style='list-style-type: disc; list-style-position: outside; margin-left: 12px; margin-bottom: 4px; padding-left: 4px'>"
    )
    .replace(
      /<ol([^>]*)>/g,
      "<ol$1 style='list-style-type: decimal; list-style-position: outside; margin-left: 12px; margin-bottom: 4px; padding-left: 4px'>"
    )
    .replace(/<li([^>]*)>/g, "<li$1 style='display: list-item'>")
    .replace(/<a\s+href=/g, "<a target='_blank' class='text-blue-500 hover:text-blue-600' href=")
    .replace(/<h1[^>]*>/g, "<h1 style='font-size: 25px; font-weight: bold; margin-bottom: 8px'>")
    .replace(/<h2[^>]*>/g, "<h2 style='font-size: 20px; font-weight: bold; margin-bottom: 8px'>");

  return html;
}
