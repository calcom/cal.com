import fs from "fs";
import matter from "gray-matter";
import { GetStaticPaths, GetStaticPropsContext } from "next";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import Image from "next/image";
import Link from "next/link";
import path from "path";

import { getAppWithMetadata } from "@calcom/app-store/_appRegistry";
import prisma from "@calcom/prisma";

import useMediaQuery from "@lib/hooks/useMediaQuery";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import App from "@components/App";
import Slider from "@components/apps/Slider";

const components = {
  a: ({ href = "", ...otherProps }: JSX.IntrinsicElements["a"]) => (
    <Link href={href}>
      <a {...otherProps} />
    </Link>
  ),
  img: ({ src = "", alt = "", placeholder, ...rest }: JSX.IntrinsicElements["img"]) => (
    <Image src={src} alt={alt} {...rest} />
  ),
  Slider: ({ items }: { items: string[] }) => {
    const isTabletAndUp = useMediaQuery("(min-width: 960px)");
    return (
      <Slider<string>
        items={items}
        title="Screenshots"
        options={{
          perView: 1,
        }}
        renderItem={(item) =>
          isTabletAndUp ? (
            <Image
              src={item}
              alt=""
              loading="eager"
              layout="fixed"
              objectFit="contain"
              objectPosition={"center center"}
              width={573}
              height={382}
            />
          ) : (
            <Image
              src={item}
              alt=""
              layout="responsive"
              objectFit="contain"
              objectPosition={"center center"}
              width={573}
              height={382}
            />
          )
        }
      />
    );
  },
};

function SingleAppPage({ data, source }: inferSSRProps<typeof getStaticProps>) {
  return (
    <App
      name={data.name}
      isGlobal={data.isGlobal}
      type={data.type}
      logo={data.logo}
      categories={[data.category]}
      author={data.publisher}
      feeType={data.feeType || "usage-based"}
      price={data.price || 0}
      commission={data.commission || 0}
      docs={data.docsUrl}
      website={data.url}
      email={data.email}
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
