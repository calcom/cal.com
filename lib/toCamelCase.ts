// Convert a CamelCase string to kebab-case
export const toCamelCase = function toCamelCase(string = ""): string {
  return String(string)
    .replace(/\s(.)/g, ($1) => $1.toUpperCase())
    .replace(/\s/g, "")
    .replace(/^(.)/, ($1) => $1.toLowerCase());
};

export default toCamelCase;
