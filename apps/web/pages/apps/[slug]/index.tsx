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
      body={<MDXRemote {...source} components={components} />}
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

  if (!singleApp) return { notFound: true };

  const appDirname = app.dirName;
  const README_PATH = path.join(process.cwd(), "..", "..", `packages/app-store/${appDirname}/README.mdx`);
  const postFilePath = path.join(README_PATH);
  let source = "";

  try {
    /* If the app doesn't have a README we fallback to the package description */
    source = fs.readFileSync(postFilePath).toString();
  } catch (error) {
    console.log(`No README.mdx provided for: ${appDirname}`);
    source = singleApp.description;
  }

  const { content, data } = matter(source);
  const mdxSource = await serialize(content, { scope: data });

  return {
    props: {
      source: mdxSource,
      data: singleApp,
    },
  };
};

export default SingleAppPage;
