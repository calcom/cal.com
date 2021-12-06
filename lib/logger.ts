import { Logger } from "tslog";

import { IS_PRODUCTION } from "@lib/config/constants";

const logger = new Logger({
  dateTimePattern: "hour:minute:second.millisecond timeZoneName",
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
