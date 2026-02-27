/**
 * PostCSS plugin to strip @property declarations for --tw-gradient-* variables.
 *
 * Tailwind v4 registers these as typed CSS properties with `inherits: false`
 * and `initial-value: #0000` (transparent). When consumers use Tailwind v3,
 * the v3 gradient classes set these variables with a value format that v4's
 * @property `syntax: "<color>"` rejects, causing the browser to fall back to
 * the transparent initial-value and making gradients invisible.
 *
 * Removing these @property declarations lets the variables behave as regular
 * untyped custom properties, which v3 gradient classes can set freely.
 */
function postcssStripGradientProperties() {
  return {
    postcssPlugin: "postcss-strip-gradient-properties",
    AtRule: {
      property(atRule) {
        if (atRule.params.startsWith("--tw-gradient-")) {
          atRule.remove();
        }
      },
    },
  };
}

postcssStripGradientProperties.postcss = true;

export default postcssStripGradientProperties;
