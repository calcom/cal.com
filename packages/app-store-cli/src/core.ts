import fs from "node:fs";
import path from "node:path";
import { APP_STORE_PATH, IS_WINDOWS_PLATFORM, TEMPLATES_PATH } from "./constants";
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
  const packageJsonPath = `${appDirPath}/package.json`;
  // Skip if package.json doesn't exist (e.g., for simplified link-as-an-app template)
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }
  const packageJsonConfig = JSON.parse(fs.readFileSync(packageJsonPath).toString());
  packageJsonConfig.name = `@calcom/${slug}`;
  packageJsonConfig.description = appDescription;
  // packageJsonConfig.description = `@calcom/${appName}`;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonConfig, null, 2));
};

const _workspaceDir = path.resolve(__dirname, "..", "..", "..");

export const BaseAppFork = {
  create: async ({
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
    externalLinkUrl,
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
    externalLinkUrl?: string;
  }) => {
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

    let config: Record<string, unknown> = {
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

    // For link-as-an-app template, update the externalLink URL
    if (template === "link-as-an-app" && externalLinkUrl) {
      config.externalLink = {
        url: externalLinkUrl,
        newTab: true,
      };
      // Also update the legacy url field for backwards compatibility
      config.url = externalLinkUrl;
    }

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

  delete: async ({ slug, isTemplate }: { slug: string; isTemplate: boolean }) => {
    const appDirPath = getAppDirPath(slug, isTemplate);
    await execSync(IS_WINDOWS_PLATFORM ? `rd /s /q ${appDirPath}` : `rm -rf ${appDirPath}`);
  },
};

export const generateAppFiles = async () => {
  await execSync(`yarn ts-node --transpile-only src/build.ts`);
};
