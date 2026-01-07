import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";
import { z } from "zod";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import { getAppAssetFullPath } from "@calcom/app-store/getAppAssetFullPath";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["lib", "parseFrontmatter"] });

const FRONTMATTER_REGEX = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Parses markdown content with YAML frontmatter
 * Replaces gray-matter to use js-yaml 4.x directly (yaml.load is safe by default)
 */
export function parseFrontmatter(source: string): { data: Record<string, unknown>; content: string } {
  const match = source.match(FRONTMATTER_REGEX);

  if (!match) {
    return { data: {}, content: source };
  }

  let data: Record<string, unknown> = {};

  try {
    const parsed = yaml.load(match[1], { schema: yaml.JSON_SCHEMA });

    if (isRecord(parsed)) {
      data = parsed;
    }
  } catch (error) {
    log.warn("Invalid YAML frontmatter", { error });
  }

  return {
    data,
    content: source.slice(match[0].length),
  };
}

export const sourceSchema = z.object({
  content: z.string(),
  data: z.object({
    description: z.string().optional(),
    items: z
      .array(
        z.union([
          z.string(),
          z.object({
            iframe: z.object({ src: z.string() }),
          }),
        ])
      )
      .optional(),
  }),
});

export type AppDataProps = NonNullable<Awaited<ReturnType<typeof getStaticProps>>>;

export const getStaticProps = async (slug: string) => {
  const appMeta = await getAppWithMetadata({
    slug,
  });

  const appFromDb = await prisma.app.findUnique({
    where: { slug: slug.toLowerCase() },
  });

  const isAppAvailableInFileSystem = appMeta;
  const isAppDisabled = isAppAvailableInFileSystem && (!appFromDb || !appFromDb.enabled);

  if (!IS_PRODUCTION && isAppDisabled) {
    return {
      isAppDisabled: true as const,
      data: {
        ...appMeta,
      },
    };
  }

  if (!appFromDb || !appMeta || isAppDisabled) return null;

  const isTemplate = appMeta.isTemplate;
  const appDirname = path.join(isTemplate ? "templates" : "", appFromDb.dirName);
  const README_PATH = path.join(process.cwd(), "..", "..", `packages/app-store/${appDirname}/DESCRIPTION.md`);
  const postFilePath = path.join(README_PATH);
  let source = "";

  try {
    source = fs.readFileSync(postFilePath).toString();
    source = source.replace(/{DESCRIPTION}/g, appMeta.description);
  } catch (error) {
    /* If the app doesn't have a README we fallback to the package description */
    console.log(`No DESCRIPTION.md provided for: ${appDirname}`);
    source = appMeta.description;
  }

  const result = parseFrontmatter(source);
  const { content, data } = sourceSchema.parse({ content: result.content, data: result.data });
  if (data.items) {
    data.items = data.items.map((item) => {
      if (typeof item === "string") {
        return getAppAssetFullPath(item, {
          dirName: appMeta.dirName,
          isTemplate: appMeta.isTemplate,
        });
      }
      return item;
    });
  }
  return {
    isAppDisabled: false as const,
    source: { content, data },
    data: appMeta,
  };
};
