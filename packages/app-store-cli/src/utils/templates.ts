import fs from "fs";
import path from "path";

import { TEMPLATES_PATH } from "../constants";
import { getAppName } from "./getAppName";

const Templates = fs
  .readdirSync(TEMPLATES_PATH)
  .filter((dir) => {
    if (fs.statSync(path.join(TEMPLATES_PATH, dir)).isDirectory() && getAppName(dir)) {
      return true;
    }
    return false;
  })
  .map((dir) => {
    try {
      const config = JSON.parse(fs.readFileSync(path.join(TEMPLATES_PATH, dir, "config.json")).toString());
      return {
        label: `${config.description}`,
        value: dir,
        category: config.categories[0],
      };
    } catch (e) {
      // config.json might not exist
      return null;
    }
  })
  .filter((item) => !!item) as { label: string; value: string; category: string }[];
export default Templates;
