import MarkdownIt from "markdown-it";

export const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
