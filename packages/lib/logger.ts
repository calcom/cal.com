import { Logger } from "tslog";

import { IS_PRODUCTION } from "./constants";

const logger = new Logger({
  minLevel: 0,
  maskValuesOfKeys: ["password", "passwordConfirmation", "credentials", "credential"],
  prettyLogTimeZone: IS_PRODUCTION ? "UTC" : "local",
  prettyErrorStackTemplate: "  • {{fileName}}\t{{method}}\n\t{{filePathWithLine}}", // default
  prettyErrorTemplate: "\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}", // default
  prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}:{{ms}} [{{logLevelName}}] ", // default with exclusion of `{{filePathWithLine}}`
  stylePrettyLogs: !IS_PRODUCTION,
  prettyLogStyles: {
    name: "yellow",
    dateIsoStr: "blue",
  },
  type: IS_PRODUCTION ? "json" : "pretty",
});

export default logger;
