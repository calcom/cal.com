import path from "node:path";
import { APP_STORE_PATH } from "../constants";

export function getAppName(candidatePath) {
  function isValidAppName(candidatePath) {
    if (
      !candidatePath.startsWith("_") &&
      candidatePath !== "ee" &&
      !candidatePath.includes("/") &&
      !candidatePath.includes("\\")
    ) {
      return candidatePath;
    }
  }
  if (isValidAppName(candidatePath)) {
    // Already a dirname of an app
    return candidatePath;
  }
  // Get dirname of app from full path
  const dirName = path.relative(APP_STORE_PATH, candidatePath);
  return isValidAppName(dirName) ? dirName : null;
}
