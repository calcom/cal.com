import fs from "fs";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import type { GetStaticPaths, GetStaticPropsContext } from "next";
import path from "path";
import { z } from "zod";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
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

function SingleAppPage({ data, source }: inferSSRProps<typeof getStaticProps>) {
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
      isProOnly={data.isProOnly}
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
  const appStore = await prisma.app.findMany({ select: { slug: true } });
  const paths = appStore.map(({ slug }) => ({ params: { slug } }));

  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true };

  const app = await prisma.app.findUnique({
    where: { slug: ctx.params.slug.toLowerCase() },
  });

  if (!app) return { notFound: true };

  const singleApp = await getAppWithMetadata(app);

  if (!singleApp) return { notFound: true };

  const isTemplate = singleApp.isTemplate;
  const appDirname = path.join(isTemplate ? "templates" : "", app.dirName);
  const README_PATH = path.join(process.cwd(), "..", "..", `packages/app-store/${appDirname}/DESCRIPTION.md`);
  const postFilePath = path.join(README_PATH);
  let source = "";

  try {
    source = fs.readFileSync(postFilePath).toString();
    source = source.replace(/{DESCRIPTION}/g, singleApp.description);
  } catch (error) {
    /* If the app doesn't have a README we fallback to the package description */
    console.log(`No DESCRIPTION.md provided for: ${appDirname}`);
    source = singleApp.description;
  }

  const result = matter(source);
  const { content, data } = sourceSchema.parse({ content: result.content, data: result.data });
  if (data.items) {
    data.items = data.items.map((item) => {
      if (typeof item === "string" && !item.includes("/api/app-store")) {
        // Make relative paths absolute
        return `/api/app-store/${appDirname}/${item}`;
      }
      return item;
    });
  }
  return {
    props: {
      source: { content, data },
      data: singleApp,
    },
  };
};

SingleAppPage.PageWrapper = PageWrapper;

export default SingleAppPage;
