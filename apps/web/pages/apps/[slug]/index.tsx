import { Prisma } from "@prisma/client";
import fs from "fs";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import type { GetStaticPaths, GetStaticPropsContext } from "next";
import Link from "next/link";
import path from "path";
import { z } from "zod";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import { getAppAssetFullPath } from "@calcom/app-store/getAppAssetFullPath";
import prisma from "@calcom/prisma";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";
import App from "@components/apps/App";

const md = new MarkdownIt("default", { html: true, breaks: true });

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

function SingleAppPage(props: inferSSRProps<typeof getStaticProps>) {
  // If it's not production environment, it would be a better idea to inform that the App is disabled.
  if (props.isAppDisabled) {
    if (process.env.NODE_ENV !== "production") {
      // TODO: Improve disabled App UI. This is just a placeholder.
      return (
        <div className="p-2">
          This App seems to be disabled. If you are an admin, you can enable this app from{" "}
          <Link href="/settings/admin/apps" className="cursor-pointer text-blue-500 underline">
            here
          </Link>
        </div>
      );
    }

    // Disabled App should give 404 any ways in production.
    return null;
  }

  const { source, data } = props;
  return (
    <App
      name={data.name}
      description={data.description}
      isGlobal={data.isGlobal}
      slug={data.slug}
      variant={data.variant}
      type={data.type}
      logo={data.logo}
      categories={data.categories ?? [data.category]}
      author={data.publisher}
      feeType={data.feeType || "usage-based"}
      price={data.price || 0}
      commission={data.commission || 0}
      docs={data.docsUrl}
      website={data.url}
      email={data.email}
      licenseRequired={data.licenseRequired}
      teamsPlanRequired={data.teamsPlanRequired}
      descriptionItems={source.data?.items as string[] | undefined}
      isTemplate={data.isTemplate}
      dependencies={data.dependencies}
      //   tos="https://zoom.us/terms"
      //   privacy="https://zoom.us/privacy"
      body={
        <>
          <div dangerouslySetInnerHTML={{ __html: md.render(source.content) }} />
        </>
      }
    />
  );
}

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  let paths: { params: { slug: string } }[] = [];

  try {
    const appStore = await prisma.app.findMany({ select: { slug: true } });
    paths = appStore.map(({ slug }) => ({ params: { slug } }));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // Database is not available at build time, but that's ok – we fall back to resolving paths on demand
    } else {
      throw e;
    }
  }

  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true };

  const appMeta = await getAppWithMetadata({
    slug: ctx.params?.slug,
  });

  const appFromDb = await prisma.app.findUnique({
    where: { slug: ctx.params.slug.toLowerCase() },
  });

  const isAppAvailableInFileSystem = appMeta;
  const isAppDisabled = isAppAvailableInFileSystem && (!appFromDb || !appFromDb.enabled);

  if (process.env.NODE_ENV !== "production" && isAppDisabled) {
    return {
      props: {
        isAppDisabled: true as const,
        data: {
          ...appMeta,
        },
      },
    };
  }

  if (!appFromDb || !appMeta || isAppDisabled) return { notFound: true };

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

SingleAppPage.PageWrapper = PageWrapper;

export default SingleAppPage;
