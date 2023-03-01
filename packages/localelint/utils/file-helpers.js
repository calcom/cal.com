const fs = require("fs");
const { glob } = require("glob");

/**
 * Returns a list of all filepaths that match the given glob string, and
 * removes any that match the given ignore patterns
 * @param {string} globStr
 * @param {string[]} ignorePatterns
 * @returns {string[]} A list of matched files
 */
async function getFilePathsFromGlob(globStr, ignorePatterns = []) {
  const files = await glob(globStr);
  return files.filter((path) => {
    // Check this path for any of our patterns
    for (let pattern of ignorePatterns) {
      // Immediately return false if even 1 pattern matches
      if (path.match(pattern) !== null) {
        return false;
      }
    }
    // Otherwise consider it a valid file
    return true;
  });
}

/**
 * A function that looks for each string literal within the given file
 * then removes that literal in-place from the given unseenKeyNames array
 * @param {string} path The filepath to read and check
 * @param {string[]} unseenKeyNames The list of unseen key names
 */
async function removeSeenKeys(path, unseenKeyNames) {
  return new Promise((res) => {
    const content = fs.readFileSync(path, { encoding: "utf-8" });
    const matches = Array.from(content.matchAll(/("|'|`)(?<literal>.+?)("|'|`)/g)).map(
      (m) => m.groups?.literal
    );
    for (let literal of matches) {
      const idx = unseenKeyNames.findIndex((v) => v == literal);
      if (idx < 0) continue;
      unseenKeyNames.splice(idx, 1);
    }
    res();
  });
}

module.exports = {
  removeSeenKeys,
  getFilePathsFromGlob,
};
