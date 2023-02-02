import fs from "fs";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import { GetStaticPaths, GetStaticPropsContext } from "next";
import path from "path";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import ExisitingGoogleCal from "@calcom/app-store/googlevideo/components/ExistingGoogleCal";
import prisma from "@calcom/prisma";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import App from "@components/apps/App";

const md = new MarkdownIt("default", { html: true, breaks: true });

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
      images={source.data?.items as string[] | undefined}
      isTemplate={data.isTemplate}
      //   tos="https://zoom.us/terms"
      //   privacy="https://zoom.us/privacy"
      body={
        <>
          {data.slug === "google-meet" && <ExisitingGoogleCal />}
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

  const { content, data } = matter(source);
  if (data.items) {
    data.items = data.items.map((item: string) => {
      if (!item.includes("/api/app-store")) {
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

export default SingleAppPage;
