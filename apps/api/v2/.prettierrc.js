const rootConfig = require("../../../packages/config/prettier-preset");

module.exports = {
  ...rootConfig,
  importOrder: ["^./instrument", ...rootConfig.importOrder],
  importOrderParserPlugins: ["typescript", "decorators-legacy"],
};
