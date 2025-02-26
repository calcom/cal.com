import fs from "fs";
import path from "path";

import { AppMetaSchema } from "../generateMetadata";
import { APP_STORE_PATH, TEMPLATES_PATH, IS_WINDOWS_PLATFORM } from "./constants";
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
      await execSync(IS_WINDOWS_PLATFORM ? `mkdir ${appDirPath}` : `mkdir -p ${appDirPath}`);
      await execSync(
        IS_WINDOWS_PLATFORM
          ? `xcopy "${TEMPLATES_PATH}\\${template}\\*" "${appDirPath}" /e /i`
          : `cp -r ${TEMPLATES_PATH}/${template}/* ${appDirPath}`
      );
    } else {
      if (!oldSlug) {
        throw new Error("oldSlug is required when editMode is true");
      }
      if (oldSlug !== slug) {
        // We need to rename only if they are different
        const oldAppDirPath = getAppDirPath(oldSlug, isTemplate);

        await execSync(
          IS_WINDOWS_PLATFORM ? `move ${oldAppDirPath} ${appDirPath}` : `mv ${oldAppDirPath} ${appDirPath}`
        );
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
    };
    const currentConfig = JSON.parse(fs.readFileSync(`${appDirPath}/config.json`).toString());
    config = {
      ...currentConfig,
      ...config,
    };
    fs.writeFileSync(`${appDirPath}/config.json`, JSON.stringify(config, null, 2));

    const parsedConfig = AppMetaSchema.parse(config); // This will throw an error if validation fails
    const metadataPath = `${appDirPath}/metadata.generated.ts`;
    // Check if the metadata file already exists
    if (fs.existsSync(metadataPath)) {
      // If metadata file exists, read the existing content
      const existingMetadata = fs.readFileSync(metadataPath, "utf-8");

      // Parse the existing metadata and update it
      const updatedMetadata = existingMetadata.replace(
        /export const metadata = (.*?);/s, // Regex to find the metadata export
        `export const metadata = ${JSON.stringify(parsedConfig, null, 2)} as const;`
      );

      // Write the updated metadata back to the file
      fs.writeFileSync(metadataPath, updatedMetadata);
      console.log(`Updated metadata in ${metadataPath}`);
    } else {
      const tsContent = `
        /* This file is auto-generated for ${config.slug}. Do not modify directly. */
        export const metadata = ${JSON.stringify(parsedConfig, null, 2)} as const;
      `;
      // If metadata file doesn't exist, create a new one
      fs.writeFileSync(metadataPath, tsContent);
      console.log(`Generated new metadata file for ${config.slug}`);
    }

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
    await execSync(IS_WINDOWS_PLATFORM ? `rd /s /q ${appDirPath}` : `rm -rf ${appDirPath}`);
  },
};

export const generateAppFiles = async () => {
  await execSync(`yarn ts-node --transpile-only src/build.ts`);
};
