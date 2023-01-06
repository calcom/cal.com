import fs from "fs";
import matter from "gray-matter";
import { GetStaticPaths, GetStaticPropsContext } from "next";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import Image, { ImageProps } from "next/legacy/image";
import Link from "next/link";
import path from "path";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import prisma from "@calcom/prisma";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import App from "@components/apps/App";

const components = {
  a: ({ href = "", ...otherProps }: JSX.IntrinsicElements["a"]) => (
    <Link href={href} legacyBehavior>
      <a {...otherProps} />
    </Link>
  ),
  img: ({
    src = "",
    alt = "",
    placeholder,
    ...rest
  }: Partial<
    Omit<ImageProps, "src" | "srcSet" | "ref" | "alt" | "width" | "height" | "loading" | "placeholder">
  > & { src?: string; alt?: string; placeholder?: string }) => <Image src={src} alt={alt} {...rest} />,
  // @TODO: In v2 the slider isn't shown anymore. However, to ensure the v1 pages keep
  // working, this component is still rendered in the MDX content. To skip them in the v2
  // content we have to render null here. In v2 the gallery is shown by directly
  // using the `items` property from the MDX's meta data.
  Slider: () => <></>,
};

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
      images={source?.scope?.items as string[] | undefined}
      //   tos="https://zoom.us/terms"
      //   privacy="https://zoom.us/privacy"
      body={source}
    />
  );
}

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  const appStore = await prisma.app.findMany({ select: { slug: true } });
  const paths = appStore.map(({ slug }) => ({ params: { slug } }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true };

  const app = await prisma.app.findUnique({
    where: { slug: ctx.params.slug },
  });

  if (!app) return { notFound: true };

  const singleApp = await getAppWithMetadata(app);

  if (!singleApp || singleApp.isTemplate) return { notFound: true };

  const appDirname = app.dirName;
  const README_PATH = path.join(process.cwd(), "..", "..", `packages/app-store/${appDirname}/README.mdx`);
  const postFilePath = path.join(README_PATH);
  const CONFIG_PATH = path.join(process.cwd(), "..", "..", `packages/app-store/${appDirname}/config.json`);
  let source = "";

  try {
    /* If the app doesn't have a README we fallback to the package description */
    let description: string | null = null;

    try {
      description = JSON.parse(fs.readFileSync(CONFIG_PATH).toString()).description;
    } catch (error) {
      console.log(`No config.json provided for: ${appDirname}`, error);
    }

    source = fs.readFileSync(postFilePath).toString();

    if (description) {
      source = source.replace(/{DESCRIPTION}/g, description);
    }
  } catch (error) {
    console.log(`No README.mdx provided for: ${appDirname}`, error);
    source = singleApp.description;
  }

  // const { content, data } = matter(source);
  // const mdxSource = await serialize(content, {
  //   scope: data,
  //   mdxOptions: {
  //     development: false,
  //   },
  // });
  // if (mdxSource.scope?.items) {
  //   mdxSource.scope.items = mdxSource.scope?.items.map((item) => {
  //     if (!item.includes("/")) {
  //       return `/api/app-store/${app.slug}/${item}`;
  //     }
  //     return item;
  //   });
  // }

  return {
    props: {
      source,
      data: singleApp,
    },
  };
};

export default SingleAppPage;
