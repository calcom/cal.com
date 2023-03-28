import MarkdownIt from "markdown-it";

export const md = new MarkdownIt("default", { html: true, breaks: true, linkify: true });
