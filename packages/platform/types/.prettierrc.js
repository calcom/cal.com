const rootConfig = require("../../config/prettier-preset");

module.exports = {
  ...rootConfig,
  importOrderParserPlugins: ["typescript", "decorators-legacy"],
};
