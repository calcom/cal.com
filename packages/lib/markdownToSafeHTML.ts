import type { Attributes } from "sanitize-html";
import sanitizeHtml from "sanitize-html";

import { md } from "@calcom/lib/markdownIt";

const sanitizeOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "s",
    "strike",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "pre",
    "code",
    "hr",
  ],
  allowedAttributes: {
    a: ["href"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],

  transformTags: {
    a: (tagName: string, attribs: Attributes) => {
      return {
        tagName: "a",
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
          target: "_blank",
        },
      };
    },
  },
};

export function markdownToSafeHTML(markdown: string | null) {
  if (!markdown) return "";

  const html = md.render(markdown);

  const safeHTML = sanitizeHtml(html, sanitizeOptions);

  const css = "colour: '#101010'; font-weight: 400; line-height: 24px; margin: 0;";
  return safeHTML.replace(/<p>/g, `<p style="${css}">`).replace(/<li>/g, `<li style="${css}">`);
}
