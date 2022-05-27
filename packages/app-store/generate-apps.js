const fs = require("fs");
const appDirs = [];
fs.readdirSync(`${__dirname}`).forEach(function (dir) {
  if (fs.statSync(`${__dirname}/${dir}`).isDirectory()) {
    if (dir.startsWith("_")) {
      return;
    }
    appDirs.push(dir);
  }
});

let clientOutput = [`import dynamic from "next/dynamic"`];
let serverOutput = [];

function forEachAppDir(callback) {
  for (let i = 0; i < appDirs.length; i++) {
    callback(appDirs[i]);
  }
}

function getObjectExporter(objectName, { dirName, importBuilder, entryBuilder }) {
  const output = [];
  forEachAppDir((dirName) => {
    output.push(importBuilder(dirName));
  });

  output.push(`export const ${objectName} = {`);

  forEachAppDir((dirName) => {
    output.push(entryBuilder(dirName));
  });

  output.push(`};`);
  return output;
}

serverOutput.push(
  ...getObjectExporter("appStoreMetadata", {
    importBuilder: (dirName) => `import { metadata as ${dirName}_meta } from "./${dirName}/_metadata";`,
    entryBuilder: (dirName) => `${dirName}:${dirName}_meta,`,
  })
);

serverOutput.push(
  ...getObjectExporter("apiHandlers", {
    importBuilder: (dirName) => `const ${dirName}_api = import("./${dirName}/api");`,
    entryBuilder: (dirName) => `${dirName}:${dirName}_api,`,
  })
);

clientOutput.push(
  ...getObjectExporter("InstallAppButtonMap", {
    importBuilder: (dirName) =>
      `const ${dirName}_installAppButton = dynamic(() =>import("./${dirName}/components/InstallAppButton"));`,
    entryBuilder: (dirName) => `${dirName}:${dirName}_installAppButton,`,
  })
);

fs.writeFileSync(`${__dirname}/apps.generated.ts`, serverOutput.join("\n"));
fs.writeFileSync(`${__dirname}/apps.components.generated.tsx`, clientOutput.join("\n"));
