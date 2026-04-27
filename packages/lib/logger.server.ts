import fs from "node:fs";

import logger from "./logger";

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
      } catch (error) {
        // fs.writeSync failed (e.g. stdout is closed); fall back to the
        // synchronous process.stderr.write which bypasses the Node.js
        // stream machinery and avoids the same failure mode.
        process.stderr.write(`[critical-logger] fs.writeSync failed: ${error}\n`);
        process.stderr.write(logString + "\n");
      }
    },
  },
});
