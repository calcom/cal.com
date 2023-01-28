import { Logger } from "tslog";

import { IS_PRODUCTION } from "./constants";

const logger = new Logger({
  type: IS_PRODUCTION ? "json" : "pretty",
  dateTimePattern: "hour:minute:second.millisecond",
  minLevel: IS_PRODUCTION ? "info" : "debug",
  displayFunctionName: false,
  displayFilePath: "hidden",
  dateTimeTimezone: IS_PRODUCTION ? "utc" : Intl.DateTimeFormat().resolvedOptions().timeZone,
  prettyInspectHighlightStyles: {
    name: "yellow",
    number: "blue",
    bigint: "blue",
    boolean: "blue",
  },
  maskValuesOfKeys: ["password", "passwordConfirmation", "credentials", "credential"],
  exposeErrorCodeFrame: !IS_PRODUCTION,
});

export default logger;
