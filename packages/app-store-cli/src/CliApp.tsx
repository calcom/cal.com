import child_process from "child_process";
import fs from "fs";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import path from "path";
import React, { FC, useEffect, useState } from "react";

const slugify = (str: string) => {
  // It is to be a valid dir name, a valid JS variable name and a valid URL path
  return str.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
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
  if (process.env.DEBUG === "1") {
    console.log(`$: ${args[0]}`);
    console.log(result);
  }
  return args[0];
};
function absolutePath(appRelativePath) {
  return path.join(appStoreDir, appRelativePath);
}
const updatePackageJson = ({ slug, appDescription, appDirPath }) => {
  const packageJsonConfig = JSON.parse(fs.readFileSync(`${appDirPath}/package.json`).toString());
  packageJsonConfig.name = `@calcom/${slug}`;
  packageJsonConfig.description = appDescription;
  // packageJsonConfig.description = `@calcom/${appName}`;
  fs.writeFileSync(`${appDirPath}/package.json`, JSON.stringify(packageJsonConfig, null, 2));
};

const BaseAppFork = {
  create: function* ({
    category,
    editMode = false,
    appDescription,
    appName,
    slug,
    publisherName,
    publisherEmail,
  }) {
    const appDirPath = getAppDirPath(slug);
    let message = !editMode ? "Forking base app" : "Updating app";
    yield message;
    if (!editMode) {
      execSync(`mkdir -p ${appDirPath}`);
      execSync(`cp -r ${absolutePath("_baseApp/*")} ${appDirPath}`);
    }
    updatePackageJson({ slug, appDirPath, appDescription });

    const categoryToVariantMap = {
      video: "conferencing",
    };

    let config = {
      "/*": "Don't modify slug - If required, do it using cli edit command",
      name: appName,
      // Plan to remove it. DB already has it and name of dir is also the same.
      slug: slug,
      type: `${slug}_${category}`,
      imageSrc: `/api/app-store/${slug}/icon.svg`,
      logo: `/api/app-store/${slug}/icon.svg`,
      url: `https://cal.com/apps/${slug}`,
      variant: categoryToVariantMap[category] || category,
      categories: [category],
      publisher: publisherName,
      email: publisherEmail,
      description: appDescription,
      // TODO: Use this to avoid edit and delete on the apps created outside of cli
      __createdUsingCli: true,
    };
    const currentConfig = JSON.parse(fs.readFileSync(`${appDirPath}/config.json`).toString());
    config = {
      ...currentConfig,
      ...config,
    };
    fs.writeFileSync(`${appDirPath}/config.json`, JSON.stringify(config, null, 2));
    fs.writeFileSync(
      `${appDirPath}/README.mdx`,
      fs.readFileSync(`${appDirPath}/README.mdx`).toString().replace("_DESCRIPTION_", appDescription)
    );
    message = !editMode ? "Forked base app" : "Updated app";
    yield message;
  },
  delete: function ({ slug }) {
    const appDirPath = getAppDirPath(slug);
    execSync(`rm -rf ${appDirPath}`);
  },
};

const Seed = {
  seedConfigPath: absolutePath("../prisma/seed-app-store.config.json"),
  update: function ({ slug, category, noDbUpdate }) {
    let configContent = "[]";
    try {
      if (fs.statSync(this.seedConfigPath)) {
        configContent = fs.readFileSync(this.seedConfigPath).toString();
      }
    } catch (e) {}
    const seedConfig = JSON.parse(configContent);

    if (!seedConfig.find((app) => app.slug === slug)) {
      seedConfig.push({
        dirName: slug,
        categories: [category],
        slug: slug,
        type: `${slug}_${category}`,
      });
    }

    // Add the message as a property to first item so that it stays always at the top
    seedConfig[0]["/*"] =
      "This file is auto-generated and updated by `yarn app-store create/edit`. Don't edit it manually";

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
  execSync(`cd ${__dirname} && yarn ts-node --transpile-only src/app-store.ts`);
};

const CreateApp = ({ noDbUpdate, slug = null, editMode = false }) => {
  // AppName
  // Type of App - Other, Calendar, Video, Payment, Messaging, Web3
  const [appInputData, setAppInputData] = useState({});
  const [inputIndex, setInputIndex] = useState(0);
  const fields = [
    { label: "App Title", name: "appName", type: "text" },
    { label: "App Description", name: "appDescription", type: "text" },
    {
      label: "Category of App",
      name: "appCategory",
      type: "select",
      options: [
        { label: "calendar", value: "calendar" },
        { label: "video", value: "video" },
        { label: "payment", value: "payment" },
        { label: "messaging", value: "messaging" },
        { label: "web3", value: "web3" },
        { label: "other", value: "other" },
      ],
    },
    { label: "Publisher Name", name: "publisherName", type: "text" },
    { label: "Publisher Email", name: "publisherEmail", type: "text" },
  ];
  const field = fields[inputIndex];
  const fieldLabel = field?.label || "";
  const fieldName = field?.name || "";
  const fieldValue = appInputData[fieldName] || "";
  const appName = appInputData["appName"];
  const category = appInputData["appCategory"];
  const appDescription = appInputData["appDescription"];
  const publisherName = appInputData["publisherName"];
  const publisherEmail = appInputData["publisherEmail"];
  const [status, setStatus] = useState<"inProgress" | "done">("inProgress");
  const allFieldsFilled = inputIndex === fields.length;
  const [progressUpdate, setProgressUpdate] = useState("");
  useEffect(() => {
    // When all fields have been filled
    if (allFieldsFilled) {
      const it = BaseAppFork.create({
        category,
        appDescription,
        appName,
        slug,
        publisherName,
        publisherEmail,
      });
      for (const item of it) {
        setProgressUpdate(item);
      }

      Seed.update({ slug, category, noDbUpdate });

      generateAppFiles();

      // FIXME: Even after CLI showing this message, it is stuck doing work before exiting
      // So we ask the user to wait for some time
      setStatus("done");
    }
  });

  if (!slug && editMode) {
    return <Text>--slug is required</Text>;
  }

  if (!editMode) {
    slug = getSlugFromAppName(appName);
  }

  if (allFieldsFilled) {
    return (
      <Box flexDirection="column">
        <Text>
          {editMode
            ? `Editing app with slug ${slug}`
            : `Creating app with name '${appName}' of type '${category}'`}
        </Text>
        <Text>{progressUpdate}</Text>
        {status === "done" ? (
          <Box flexDirection="column" paddingTop={2} paddingBottom={2}>
            <Text bold italic>
              Just wait for few seconds to process to exit and you are good to go. Your App code exists at $
              {getAppDirPath(slug)}
            </Text>
            <Text bold italic>
              App Summary:
            </Text>
            <Box flexDirection="column">
              <Box flexDirection="row">
                <Text color="green">Slug: </Text>
                <Text>{slug}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">App URL: </Text>
                <Text>{`http://localhost:3000/apps/${slug}`}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Name: </Text>
                <Text>{appName}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Description: </Text>
                <Text>{appDescription}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Category: </Text>
                <Text>{category}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Publisher Name: </Text>
                <Text>{publisherName}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="green">Publisher Email: </Text>
                <Text>{publisherEmail}</Text>
              </Box>
            </Box>
          </Box>
        ) : (
          <Text>Please wait...</Text>
        )}
        <Text italic color="gray">
          Note: You should not rename app directory manually. Use cli only to do that as it needs to be
          updated in DB as well
        </Text>
      </Box>
    );
  }

  // Hack: using field.name == "appTitle" to identify that app Name has been submitted and not being edited.
  if (!editMode && field.name === "appTitle" && slug && fs.existsSync(getAppDirPath(slug))) {
    return (
      <>
        <Text>App with slug {slug} already exists. If you want to edit it, use edit command</Text>
      </>
    );
  }
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="green">{`${fieldLabel}:`}</Text>
        {field.type == "text" ? (
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
        ) : (
          <SelectInput<string>
            items={field.options}
            onSelect={(item) => {
              setAppInputData((appInputData) => {
                return {
                  ...appInputData,
                  [fieldName]: item.value,
                };
              });
              setInputIndex((index) => {
                return index + 1;
              });
            }}
          />
        )}
      </Box>
      <Box>
        <Text color="gray" italic>
          {field.explainer}
        </Text>
      </Box>
    </Box>
  );
};

const DeleteApp = ({ noDbUpdate, slug }) => {
  const [confirmedAppSlug, setConfirmedAppSlug] = useState("");
  const [allowDeletion, setAllowDeletion] = useState(false);
  const [state, setState] = useState({ done: null, description: null });
  useEffect(() => {
    if (allowDeletion) {
      BaseAppFork.delete({ slug });
      Seed.revert({ slug });
      generateAppFiles();
      setState({ description: `App with slug ${slug} has been deleted`, done: true });
    }
  }, [allowDeletion, slug]);
  return (
    <>
      <Text>
        Confirm the slug of the app that you want to delete. Note, that it would cleanup the app directory,
        App table and Credential table
      </Text>
      {!state.done && (
        <TextInput
          value={confirmedAppSlug}
          onSubmit={(value) => {
            if (value === slug) {
              setState({ description: `Deletion started`, done: true });
              setAllowDeletion(true);
            } else {
              setState({ description: `Slug doesn't match - Should have been ${slug}`, done: true });
            }
          }}
          onChange={(val) => {
            setConfirmedAppSlug(val);
          }}
        />
      )}
      <Text>{state.description}</Text>
    </>
  );
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
  if (command === "edit") {
    return <CreateApp slug={slug} editMode={true} noDbUpdate={noDbUpdate} />;
  }
};
module.exports = App;
export default App;
