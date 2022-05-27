import child_process from "child_process";
import fs from "fs";
import { Box, Text, useApp, useInput, useStdin } from "ink";
import TextInput from "ink-text-input";
import React, { FC, useEffect, useRef, useState } from "react";

const InputAppDetails = () => {
  // AppName
  // Type of App - Other, Calendar, Video, Payment, Messaging, Web3
  const [appInputData, setAppInputData] = useState({});
  const [inputIndex, setInputIndex] = useState(0);
  const fields = [
    { label: "App Name", name: "appName" },
    { label: "Type of App", name: "appType" },
  ];
  const fieldLabel = fields[inputIndex]?.label || "";
  const fieldName = fields[inputIndex]?.name || "";
  const fieldValue = appInputData[fieldName] || "";
  const appName = appInputData["appName"];
  const appType = appInputData["appType"];
  const [result, setResult] = useState("...");
  useEffect(() => {
    if (inputIndex === fields.length) {
      let config = {
        name: appName,
        type: appType,
        slug: appName,
      };
      const appDirPath = `packages/app-store/${appName}/`;
      child_process.execSync(
        `mkdir -p ${appDirPath} && cp -r packages/app-store/CLI_BASE__APP_NAME/* ${appDirPath}`
      );

      const packageJsonConfig = JSON.parse(fs.readFileSync(`${appDirPath}/package.json`).toString());
      packageJsonConfig.name = `@calcom/${appName}`;
      // packageJsonConfig.description = `@calcom/${appName}`;
      fs.writeFileSync(`${appDirPath}/package.json`, JSON.stringify(packageJsonConfig, null, 2));

      const baseConfig = JSON.parse(fs.readFileSync(`${appDirPath}/config.json`).toString());
      config = {
        ...baseConfig,
        ...config,
      };
      fs.writeFileSync(`${appDirPath}/config.json`, JSON.stringify(config, null, 2));

      const seedConfig = JSON.parse(fs.readFileSync(`packages/prisma/seed-app-store.config.json`).toString());
      if (!seedConfig.find((app) => app.name === appName)) {
        seedConfig.push({
          name: appName,
          dirName: appName,
          categories: [appType],
          type: `${appName}_${appType}`,
        });
      }

      fs.writeFileSync(`packages/prisma/seed-app-store.config.json`, JSON.stringify(seedConfig, null, 2));
      child_process.execSync(`yarn db-seed`);
      child_process.execSync(`cd packages/app-store && node generate-apps.js`);

      setResult("App Generated");
    }
  });
  if (inputIndex === fields.length) {
    return (
      <>
        <Text>
          Creating app with name "{appName}" of type "{appType}"
        </Text>
        <Text>{result}</Text>
      </>
    );
  }
  return (
    <Box>
      <Text color="green">{`${fieldLabel}:`}</Text>
      <TextInput
        value={fieldValue}
        onSubmit={(value) => {
          if (!value) {
            return;
          }
          setInputIndex((index) => {
            return index + 1;
          });
        }}
        onChange={(value) => {
          if (value) {
            value = value.replace(/-/g, "_");
          }
          setAppInputData((appInputData) => {
            return {
              ...appInputData,
              [fieldName]: value,
            };
          });
        }}
      />
    </Box>
  );
};

const App: FC<{ name?: string }> = () => <InputAppDetails />;
module.exports = App;
export default App;
