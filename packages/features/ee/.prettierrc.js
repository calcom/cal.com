const rootConfig = require("../../config/prettier-preset");

module.exports = {
  ...rootConfig,
  importOrder: ["^./instrument", ...rootConfig.importOrder],
  importOrderParserPlugins: ["typescript", "decorators-legacy"],
};
