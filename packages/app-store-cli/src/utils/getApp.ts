import fs from "fs";
import path from "path";

import { APP_STORE_PATH } from "../constants";
import { getAppName } from "./getAppName";

export const getApp = (slug: string) => {
  const foundApp = fs
    .readdirSync(APP_STORE_PATH)
    .filter((dir) => {
      if (fs.statSync(path.join(APP_STORE_PATH, dir)).isDirectory() && getAppName(dir)) {
        return true;
      }
      return false;
    })
    .find((appName) => appName === slug);
  if (foundApp) {
    try {
      return JSON.parse(fs.readFileSync(path.join(APP_STORE_PATH, foundApp, "config.json")).toString());
    } catch (e) {
      return {};
    }
  }
  return null;
};
