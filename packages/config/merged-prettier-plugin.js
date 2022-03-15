/* @see https://github.com/tailwindlabs/prettier-plugin-tailwindcss/issues/31#issuecomment-1024722576 */
const tailwind = require("prettier-plugin-tailwindcss");
const sortImports = require("@trivago/prettier-plugin-sort-imports");

const combinedFormatter = {
  parsers: {
    typescript: {
      ...tailwind.parsers.typescript,
      preprocess: sortImports.parsers.typescript.preprocess,
    },
  },
};

module.exports = combinedFormatter;
