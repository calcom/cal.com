import { Logger } from "tslog";

const isProduction = process.env.NODE_ENV === "production";

const logger = new Logger({
  dateTimePattern: "hour:minute:second.millisecond timeZoneName",
  displayFunctionName: false,
  displayFilePath: "hidden",
  dateTimeTimezone: isProduction ? "utc" : Intl.DateTimeFormat().resolvedOptions().timeZone,
  prettyInspectHighlightStyles: {
    name: "yellow",
    number: "blue",
    bigint: "blue",
    boolean: "blue",
  },
  maskValuesOfKeys: ["password", "passwordConfirmation", "credentials", "credential"],
  exposeErrorCodeFrame: !isProduction,
});

export default logger;
