const { getFilePathsFromGlob, removeSeenKeys } = require("../utils/file-helpers");
const { gatherCombinedKeyNames } = require("../utils/key-helpers");

module.exports = async function (options) {
  const { primaryTranslationFiles, projectSources, ignoreFilePatterns } = options;
  let unusedKeyNames = gatherCombinedKeyNames(primaryTranslationFiles);

  let allFilePaths = [];
  for (let thisGlobStr of projectSources) {
    const theseFiles = await getFilePathsFromGlob(thisGlobStr, ignoreFilePatterns);
    allFilePaths = [...allFilePaths, ...theseFiles];
  }
  if (!allFilePaths.length) {
    throw new Error(`Couldn't find any files to process`);
  }

  unusedKeyNames = await unusedKeyNames;

  let seenKeys = unusedKeyNames.length;
  for (let thisPath of allFilePaths) {
    removeSeenKeys(thisPath, unusedKeyNames);
  }

  missingKeys = unusedKeyNames.length;
  seenKeys = seenKeys - missingKeys;

  console.log(`Summary:`);
  console.log(`  Seen Files:     ${allFilePaths.length.toLocaleString()}`);
  console.log(`  Keys Present:   ${seenKeys.toLocaleString()}`);
  console.log(`  Keys Missing:   ${missingKeys.toLocaleString()}`);

  if (unusedKeyNames.length) {
    console.log(`\nHere's a list of all missing keys:`);
    console.log(`- ${unusedKeyNames.join("\n- ")}`);
    process.exit(1);
  }
  process.exit(0);
};
