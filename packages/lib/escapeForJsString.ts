/** Escapes a value for safe use in a JS string literal within a <script> block. */
export function escapeForJsString(value: string): string {
  return JSON.stringify(value).slice(1, -1).replace(/</g, "\\u003c");
}
