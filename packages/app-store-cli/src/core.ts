import fs from "fs";
import path from "path";

import { APP_STORE_PATH, TEMPLATES_PATH } from "./constants";
import execSync from "./utils/execSync";

const slugify = (str: string) => {
  // A valid dir name
  // A valid URL path
  // It is okay to not be a valid variable name. This is so that we can use hyphens which look better then underscores in URL and as directory name
  return str.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
};

export function getSlugFromAppName(appName: string): string {
  if (!appName) {
    return appName;
  }
  return slugify(appName);
}

export function getAppDirPath(slug: string, isTemplate: boolean) {
  if (!isTemplate) {
    return path.join(APP_STORE_PATH, `${slug}`);
  }
  return path.join(TEMPLATES_PATH, `${slug}`);
}

const updatePackageJson = ({
  slug,
  appDescription,
  appDirPath,
}: {
  slug: string;
  appDescription: string;
  appDirPath: string;
}) => {
  const packageJsonConfig = JSON.parse(fs.readFileSync(`${appDirPath}/package.json`).toString());
  packageJsonConfig.name = `@calcom/${slug}`;
  packageJsonConfig.description = appDescription;
  // packageJsonConfig.description = `@calcom/${appName}`;
  fs.writeFileSync(`${appDirPath}/package.json`, JSON.stringify(packageJsonConfig, null, 2));
};

const workspaceDir = path.resolve(__dirname, "..", "..", "..");

export const BaseAppFork = {
  create: async function ({
    category,
    editMode = false,
    description,
    name,
    slug,
    publisher,
    email,
    template,
    isTemplate,
    oldSlug,
  }: {
    category: string;
    editMode?: boolean;
    description: string;
    name: string;
    slug: string;
    publisher: string;
    email: string;
    template: string;
    isTemplate: boolean;
    oldSlug?: string;
  }) {
    const appDirPath = getAppDirPath(slug, isTemplate);
    if (!editMode) {
      await execSync(`mkdir -p ${appDirPath}`);
      await execSync(`cp -r ${TEMPLATES_PATH}/${template}/* ${appDirPath}`);
    } else {
      if (!oldSlug) {
        throw new Error("oldSlug is required when editMode is true");
      }
      if (oldSlug !== slug) {
        // We need to rename only if they are different
        const oldAppDirPath = getAppDirPath(oldSlug, isTemplate);

        await execSync(`mv ${oldAppDirPath} ${appDirPath}`);
      }
    }
    updatePackageJson({ slug, appDirPath, appDescription: description });

    const categoryToVariantMap = {
      video: "conferencing",
    };

    let config = {
      name: name,
      // Plan to remove it. DB already has it and name of dir is also the same.
      slug: slug,
      type: `${slug}_${category}`,
      // TODO: Remove usage of imageSrc, it is being used in ConnectCalendars.tsx. After that delete imageSrc in all configs and from here
      imageSrc: `icon.svg`,
      logo: `icon.svg`,
      variant: categoryToVariantMap[category as keyof typeof categoryToVariantMap] || category,
      categories: [category],
      publisher: publisher,
      email: email,
      description: description,
      // TODO: Use this to avoid edit and delete on the apps created outside of cli
      __createdUsingCli: true,
      isTemplate,
      // Store the template used to create an app
      __template: template,
      dirName: slug,
    };
    const currentConfig = JSON.parse(fs.readFileSync(`${appDirPath}/config.json`).toString());
    config = {
      ...currentConfig,
      ...config,
    };
    fs.writeFileSync(`${appDirPath}/config.json`, JSON.stringify(config, null, 2));
    fs.writeFileSync(
      `${appDirPath}/DESCRIPTION.md`,
      fs
        .readFileSync(`${appDirPath}/DESCRIPTION.md`)
        .toString()
        .replace(/_DESCRIPTION_/g, description)
        .replace(/_APP_DIR_/g, slug)
    );
    // New monorepo package has been added, so we need to run yarn again
    await execSync("yarn");
  },

  delete: async function ({ slug, isTemplate }: { slug: string; isTemplate: boolean }) {
    const appDirPath = getAppDirPath(slug, isTemplate);
    await execSync(`rm -rf ${appDirPath}`);
  },
};

export const generateAppFiles = async () => {
  await execSync(`yarn ts-node --transpile-only src/build.ts`);
};
