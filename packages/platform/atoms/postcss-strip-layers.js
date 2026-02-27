/**
 * PostCSS plugin to strip @layer wrappers from the output CSS.
 *
 * The .calcom-atoms prefix already handles scoping, so @layer directives
 * are not needed for external consumers and cause conflicts when imported
 * through bundlers that have Tailwind v3's PostCSS plugin active.
 *
 * This unwraps @layer blocks (removes the wrapper, keeps the content).
 */
function postcssStripLayers() {
  return {
    postcssPlugin: "postcss-strip-layers",
    AtRule: {
      layer(atRule) {
        atRule.replaceWith(atRule.nodes);
      },
    },
  };
}

postcssStripLayers.postcss = true;

export default postcssStripLayers;
