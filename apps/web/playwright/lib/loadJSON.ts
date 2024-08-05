import fs from "fs";
import path from "path";

/**
 *  Simple utility to load JSON files from the file system. Needed to avoid certain errors with:
 * `TypeError: Module "*" needs an import attribute of type "json"`
 * @see https://stackoverflow.com/a/73747606
 */
export const loadJSON = (file: string) => JSON.parse(fs.readFileSync(path.join(__dirname, file)).toString());
