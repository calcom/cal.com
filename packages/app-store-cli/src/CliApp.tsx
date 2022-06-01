import child_process from "child_process";
import fs from "fs";
import { Box, Text, useApp, useInput, useStdin } from "ink";
import TextInput from "ink-text-input";
import path from "path";
import React, { FC, useEffect, useRef, useState } from "react";

const slugify = (str: string) => {
  // It is to be a valid dir name, a valid JS variable name and a valid URL path
  return str.replace(/[^a-zA-Z0-9-]/g, "_").toLowerCase();
};

function getSlugFromAppName(appName: string | null): string | null {
  if (!appName) {
    return appName;
  }
  return slugify(appName);
}

function getAppDirPath(slug: any) {
  return path.join(appStoreDir, `${slug}`);
}

const appStoreDir = path.resolve(__dirname, "..", "..", "app-store");
const workspaceDir = path.resolve(__dirname, "..", "..", "..");
const execSync = (...args) => {
  const result = child_process.execSync(...args).toString();
  console.log(`$: ${args[0]}`);
  console.log(result);
  return args[0];
};
function absolutePath(appRelativePath) {
  return path.join(appStoreDir, appRelativePath);
}
const updatePackageJson = ({ slug, appDirPath }) => {
  const packageJsonConfig = JSON.parse(fs.readFileSync(`${appDirPath}/package.json`).toString());
  packageJsonConfig.name = `@calcom/${slug}`;
  // packageJsonConfig.description = `@calcom/${appName}`;
  fs.writeFileSync(`${appDirPath}/package.json`, JSON.stringify(packageJsonConfig, null, 2));
};

const BaseAppFork = {
  create: function* ({ appType, appName, slug, appTitle, publisherName, publisherEmail }) {
    const appDirPath = getAppDirPath(slug);
    yield "Forking base app";
    execSync(`mkdir -p ${appDirPath}`);
    execSync(`cp -r ${absolutePath("_baseApp/*")} ${appDirPath}`);
    updatePackageJson({ slug, appDirPath });

    let config = {
      name: appName,
      title: appTitle,
      // @deprecated - It shouldn't exist.
      type: slug,
      slug: slug,
      imageSrc: `/api/app-store/${slug}/icon.svg`,
      logo: `/api/app-store/${slug}/icon.svg`,
      url: `https://cal.com/apps/${slug}`,
      variant: appType,
      publisher: publisherName,
      email: publisherEmail,
    };
    const baseConfig = JSON.parse(fs.readFileSync(`${appDirPath}/config.json`).toString());
    config = {
      ...baseConfig,
      ...config,
    };
    fs.writeFileSync(`${appDirPath}/config.json`, JSON.stringify(config, null, 2));
    yield "Forked base app";
  },
  delete: function ({ slug }) {
    const appDirPath = getAppDirPath(slug);
    execSync(`rm -rf ${appDirPath}`);
  },
};

const Seed = {
  seedConfigPath: absolutePath("../prisma/seed-app-store.config.json"),
  update: function ({ slug, appType, noDbUpdate }) {
    const seedConfig = JSON.parse(fs.readFileSync(this.seedConfigPath).toString());
    if (!seedConfig.find((app) => app.slug === slug)) {
      seedConfig.push({
        dirName: slug,
        categories: [appType],
        slug: slug,
      });
    }

    fs.writeFileSync(this.seedConfigPath, JSON.stringify(seedConfig, null, 2));
    if (!noDbUpdate) {
      execSync(`cd ${workspaceDir} && yarn db-seed`);
    }
  },
  revert: async function ({ slug, noDbUpdate }) {
    let seedConfig = JSON.parse(fs.readFileSync(this.seedConfigPath).toString());
    seedConfig = seedConfig.filter((app) => app.slug !== slug);
    fs.writeFileSync(this.seedConfigPath, JSON.stringify(seedConfig, null, 2));
    if (!noDbUpdate) {
      execSync(`yarn workspace @calcom/prisma delete-app ${slug}`);
    }
  },
};

const generateAppFiles = () => {
  execSync(`cd ${appStoreDir} && node app-store.js`);
};

const CreateApp = ({ noDbUpdate }) => {
  // AppName
  // Type of App - Other, Calendar, Video, Payment, Messaging, Web3
  const [appInputData, setAppInputData] = useState({});
  const [inputIndex, setInputIndex] = useState(0);
  const fields = [
    { label: "App Name", name: "appName" },
    { label: "App Title", name: "appTitle" },
    { label: "Type of App", name: "appType" },
    { label: "Publisher Name", name: "publisherName" },
    { label: "Publisher Email", name: "publisherEmail" },
  ];
  const fieldLabel = fields[inputIndex]?.label || "";
  const fieldName = fields[inputIndex]?.name || "";
  const fieldValue = appInputData[fieldName] || "";
  const appName = appInputData["appName"];
  const appType = appInputData["appType"];
  const appTitle = appInputData["appTitle"];
  const publisherName = appInputData["publisherName"];
  const publisherEmail = appInputData["publisherEmail"];
  const [result, setResult] = useState("...");
  const slug = getSlugFromAppName(appName);
  const allFieldsFilled = inputIndex === fields.length;

  useEffect(() => {
    // When all fields have been filled
    if (allFieldsFilled) {
      const it = BaseAppFork.create({ appType, appName, slug, appTitle, publisherName, publisherEmail });
      for (const item of it) {
        setResult(item);
      }

      Seed.update({ slug, appType, noDbUpdate });

      generateAppFiles();

      // FIXME: Even after CLI showing this message, it is stuck doing work before exiting
      setResult("App almost generated. Wait for a few seconds.");
    }
  });

  if (allFieldsFilled) {
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

const DeleteApp = ({ noDbUpdate, slug }) => {
  BaseAppFork.delete({ slug });
  Seed.revert({ slug });
  generateAppFiles();
  return <Text>Deleted App {slug}.</Text>;
};

const App: FC<{ noDbUpdate?: boolean; command: "create" | "delete"; slug?: string }> = ({
  command,
  noDbUpdate,
  slug,
}) => {
  if (command === "create") {
    return <CreateApp noDbUpdate={noDbUpdate} />;
  }
  if (command === "delete") {
    return <DeleteApp slug={slug} noDbUpdate={noDbUpdate} />;
  }
};
module.exports = App;
export default App;
