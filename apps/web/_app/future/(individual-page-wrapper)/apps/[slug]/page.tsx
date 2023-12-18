import AppPage from "@pages/apps/[slug]/index";
import { Prisma } from "@prisma/client";
import { _generateMetadata } from "_app/_utils";
import fs from "fs";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import path from "path";
import { z } from "zod";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import { getAppAssetFullPath } from "@calcom/app-store/getAppAssetFullPath";
import { APP_NAME, IS_PRODUCTION } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const sourceSchema = z.object({
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

export const generateMetadata = async ({ params }: { params: Record<string, string | string[]> }) => {
  const { data } = await getPageProps({ params });

  return await _generateMetadata(
    () => `${data.name} | ${APP_NAME}`,
    () => data.description
  );
};

export const generateStaticParams = async () => {
  try {
    const appStore = await prisma.app.findMany({ select: { slug: true } });
    return appStore.map(({ slug }) => ({ slug }));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // Database is not available at build time, but that's ok – we fall back to resolving paths on demand
    } else {
      throw e;
    }
  }

  return [];
};

const getPageProps = async ({ params }: { params: Record<string, string | string[]> }) => {
  if (typeof params?.slug !== "string") {
    notFound();
  }

  const appMeta = await getAppWithMetadata({
    slug: params?.slug,
  });

  const appFromDb = await prisma.app.findUnique({
    where: { slug: params.slug.toLowerCase() },
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

  if (!appFromDb || !appMeta || isAppDisabled) {
    notFound();
  }

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
    isAppDisabled: false as const,
    source: { content, data },
    data: appMeta,
  };
};

export default async function Page({ params }: { params: Record<string, string | string[]> }) {
  const pageProps = await getPageProps({ params });

  return <AppPage {...pageProps} />;
}

export const dynamic = "force-static";
