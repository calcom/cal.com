import fs from "fs";
import { Logger } from "tslog";

import { IS_PRODUCTION } from "./constants";

const logger = new Logger({
  minLevel: parseInt(process.env.NEXT_PUBLIC_LOGGER_LEVEL || "4"),
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

/** This should be used if we want to ensure a log statement is always executed.
 *
 * This should only be used server side
 */
export const criticalLogger = logger.getSubLogger({
  name: "critical",
  overwrite: {
    transportJSON: (logObj) => {
      const logString = JSON.stringify(logObj);
      const buffer = Buffer.from(logString + "\n");

      try {
        fs.writeSync(process.stdout.fd, buffer);
      } catch {
        console.log(logString);
      }
    },
  },
});

export default logger;
