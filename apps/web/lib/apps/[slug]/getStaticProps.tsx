import fs from "fs";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import type { GetStaticPropsContext } from "next";
import path from "path";
import { z } from "zod";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import { getAppAssetFullPath } from "@calcom/app-store/getAppAssetFullPath";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const md = new MarkdownIt("default", { html: true, breaks: true });

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

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;

  const appMeta = await getAppWithMetadata({
    slug: ctx.params?.slug,
  });

  const appFromDb = await prisma.app.findUnique({
    where: { slug: ctx.params.slug.toLowerCase() },
  });

  const isAppAvailableInFileSystem = appMeta;
  const isAppDisabled = isAppAvailableInFileSystem && (!appFromDb || !appFromDb.enabled);

  if (!IS_PRODUCTION && isAppDisabled) {
    return {
      props: {
        isAppDisabled: true as const,
        data: {
          ...appMeta,
        },
      },
    };
  }

  if (!appFromDb || !appMeta || isAppDisabled) return { notFound: true } as const;

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

  const result = matter(source);
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
    props: {
      isAppDisabled: false as const,
      source: { content, data },
      data: appMeta,
    },
  };
};
