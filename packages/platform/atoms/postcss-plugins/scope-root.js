/**
 * PostCSS plugin that scopes :root, :host, and html selectors to .calcom-atoms.
 *
 * This runs AFTER postcss-prefixwrap to fix incorrectly wrapped selectors.
 * postcss-prefixwrap turns `:root` into `.calcom-atoms :root` which is invalid
 * (`:root` can't be a descendant of a class). This plugin corrects those
 * selectors so that CSS custom properties are scoped to `.calcom-atoms` containers.
 *
 * Examples:
 *   .calcom-atoms :root  → .calcom-atoms
 *   .calcom-atoms :host  → .calcom-atoms
 *   .calcom-atoms html   → .calcom-atoms
 */
const CONTAINER_CLASS = ".calcom-atoms";

const scopeRoot = () => {
  return {
    postcssPlugin: "postcss-scope-root",
    Rule(rule) {
      const selector = rule.selector;

      // Quick bail-out for selectors that don't contain :root, :host, or html
      if (!selector.includes(":root") && !selector.includes(":host") && !selector.includes("html")) {
        return;
      }

      const parts = selector.split(",").map((s) => s.trim());
      let changed = false;

      const newParts = parts.map((s) => {
        const original = s;

        // Fix postcss-prefixwrap output: ".calcom-atoms :root" → ".calcom-atoms"
        s = s.replace(new RegExp(`\\${CONTAINER_CLASS}\\s+:root`, "g"), CONTAINER_CLASS);
        s = s.replace(new RegExp(`\\${CONTAINER_CLASS}\\s+:host`, "g"), CONTAINER_CLASS);
        s = s.replace(new RegExp(`\\${CONTAINER_CLASS}\\s+html\\b`, "g"), CONTAINER_CLASS);

        // Handle bare selectors that prefixwrap may have missed
        if (s === ":root" || s === ":host" || s === "html") {
          s = CONTAINER_CLASS;
        }

        if (s !== original) {
          changed = true;
        }

        return s;
      });

      if (changed) {
        // Deduplicate (e.g. `:root, :host` both become `.calcom-atoms`)
        const unique = [...new Set(newParts)];
        rule.selector = unique.join(",\n  ");
      }
    },
  };
};

scopeRoot.postcss = true;
export default scopeRoot;
