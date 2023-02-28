const fs = require("fs");
/**
 * Returns a sorted list of all key names included in the given paths
 * @param {string[]} paths All filepaths to process
 * @returns {string[]} A list of unified key names
 */
async function gatherCombinedKeyNames(paths) {
  // Get our data
  const data = await Promise.all(paths.map(gatherKeyNames));
  // Fail if we have at least 1 failed result
  const rejectedCalls = data.filter((call) => call.status === "rejected");
  if (rejectedCalls.length) {
    const errs = rejectedCalls.map((c) => c.reason).join("\n");
    throw new Error(`Received the following error when processing a translation file:\n${errs}`);
  }

  // Merge the key names, sort, and return
  return [...new Set(data.reduce((prev, curr) => prev.concat(curr), []).sort())];
}

/**
 * Returns an array of key names within the given filepath
 * @param {string} path The filename to process
 * @returns {string[]} An array of key names within the file
 */
async function gatherKeyNames(path) {
  return gatherKeys(path).then((keys) => Object.keys(keys));
}

/**
 * Gathers the keys / values from the given path. Currently
 * this script assumes the translation file is in a JSON format
 * @param path The filepath of the file to analyze
 * @returns {object} Object of translatable string's key and value
 */
async function gatherKeys(path) {
  let jsonContents;
  try {
    jsonContents = fs.readFileSync(path, { encoding: "utf-8" });
    jsonContents = JSON.parse(jsonContents);
  } catch (error) {
    throw new Error(
      `There was a problem processing translation keys within the following file: ${path}\n${error}`
    );
  }
  return jsonContents;
}

module.exports = {
  gatherCombinedKeyNames,
  gatherKeyNames,
  gatherKeys,
};
