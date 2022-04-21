import fs from "fs";
import matter from "gray-matter";
import { GetStaticPaths, GetStaticPathsResult, GetStaticPropsContext } from "next";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import Image from "next/image";
import Link from "next/link";
import path from "path";

import { getAppRegistry } from "@calcom/app-store/_appRegistry";

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
            <Image src={item} alt="" loading="eager" layout="fixed" width={573} height={382} />
          ) : (
            <Image src={item} alt="" layout="responsive" width={573} height={382} />
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
      author="Cal.com"
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
  const appStore = getAppRegistry();
  const paths = appStore.reduce((paths, app) => {
    paths.push({ params: { slug: app.slug } });
    return paths;
  }, [] as GetStaticPathsResult<{ slug: string }>["paths"]);

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  const appStore = getAppRegistry();

  if (typeof ctx.params?.slug !== "string") {
    return {
      notFound: true,
    };
  }

  const singleApp = appStore.find((app) => app.slug === ctx.params?.slug);

  if (!singleApp) {
    return {
      notFound: true,
    };
  }

  const appDirname = singleApp.type.replace("_", "");
  const README_PATH = path.join(process.cwd(), "..", "..", `packages/app-store/${appDirname}/README.mdx`);
  const postFilePath = path.join(README_PATH);
  let source = "";

  try {
    /* If the app doesn't have a README we fallback to the packagfe description */
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
