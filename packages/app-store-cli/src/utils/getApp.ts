import fs from "fs";
import path from "path";

import { APP_STORE_PATH, TEMPLATES_PATH } from "../constants";
import { getAppName } from "./getAppName";

export const getApp = (slug: string, isTemplate: boolean) => {
  const base = isTemplate ? TEMPLATES_PATH : APP_STORE_PATH;
  const foundApp = fs
    .readdirSync(base)
    .filter((dir) => {
      if (fs.statSync(path.join(base, dir)).isDirectory() && getAppName(dir)) {
        return true;
      }
      return false;
    })
    .find((appName) => appName === slug);
  if (foundApp) {
    try {
      return JSON.parse(fs.readFileSync(path.join(base, foundApp, "config.json")).toString());
    } catch (e) {
      return {};
    }
  }
  return null;
};
