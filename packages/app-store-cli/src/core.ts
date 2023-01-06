import fs from "fs";
import path from "path";

import seedAppStoreConfig from "@calcom/prisma/seed-app-store.config.json";

import { TEMPLATES_PATH } from "./constants";
import execSync from "./utils/execSync";

const slugify = (str: string) => {
  // A valid dir name
  // A valid URL path
  // It is okay to not be a valid variable name. This is so that we can use hyphens which look better then underscores in URL and as directory name
  return str.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
};

export function getSlugFromAppName(appName: string | null): string | null {
  if (!appName) {
    return appName;
  }
  return slugify(appName);
}

export function getAppDirPath(slug: string) {
  return path.join(appStoreDir, `${slug}`);
}

function absolutePath(appRelativePath: string) {
  return path.join(appStoreDir, appRelativePath);
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

const appStoreDir = path.resolve(__dirname, "..", "..", "app-store");
const workspaceDir = path.resolve(__dirname, "..", "..", "..");

export const BaseAppFork = {
  create: async function ({
    category,
    editMode = false,
    appDescription,
    appName,
    slug,
    publisherName,
    publisherEmail,
    template,
  }: {
    category: string;
    editMode?: boolean;
    appDescription: string;
    appName: string;
    slug: string;
    publisherName: string;
    publisherEmail: string;
    template: string;
  }) {
    const appDirPath = getAppDirPath(slug);
    if (!editMode) {
      await execSync(`mkdir -p ${appDirPath}`);
      await execSync(`cp -r ${TEMPLATES_PATH}/${template}/* ${appDirPath}`);
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
      variant: categoryToVariantMap[category as keyof typeof categoryToVariantMap] || category,
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
      fs
        .readFileSync(`${appDirPath}/README.mdx`)
        .toString()
        .replace(/_DESCRIPTION_/g, appDescription)
        .replace(/_APP_DIR_/g, slug)
    );
  },
  delete: async function ({ slug }: { slug: string }) {
    const appDirPath = getAppDirPath(slug);
    await execSync(`rm -rf ${appDirPath}`);
  },
};

export const Seed = {
  seedConfigPath: absolutePath("../prisma/seed-app-store.config.json"),
  update: async function ({
    slug,
    category,
    noDbUpdate,
  }: {
    slug: string;
    category: string;
    noDbUpdate?: boolean;
  }) {
    let configContent = "[]";
    try {
      if (fs.statSync(this.seedConfigPath)) {
        configContent = fs.readFileSync(this.seedConfigPath).toString();
      }
    } catch (e) {}
    const seedConfig: typeof seedAppStoreConfig = JSON.parse(configContent);

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

    // Add the message as a property to first item so that it stays always at the top
    seedConfig[0]["/*"] =
      "This file is auto-generated and updated by `yarn app-store create/edit`. Don't edit it manually";

    fs.writeFileSync(this.seedConfigPath, JSON.stringify(seedConfig, null, 2));
    if (!noDbUpdate) {
      await execSync(`cd ${workspaceDir} && yarn db-seed`);
    }
  },
  revert: async function ({ slug, noDbUpdate }: { slug: string; noDbUpdate?: boolean }) {
    let seedConfig: typeof seedAppStoreConfig = JSON.parse(fs.readFileSync(this.seedConfigPath).toString());
    seedConfig = seedConfig.filter((app) => app.slug !== slug);
    fs.writeFileSync(this.seedConfigPath, JSON.stringify(seedConfig, null, 2));
    if (!noDbUpdate) {
      await execSync(`yarn workspace @calcom/prisma delete-app ${slug}`);
    }
  },
};

export const generateAppFiles = async () => {
  await execSync(`yarn ts-node --transpile-only src/build.ts`);
};
