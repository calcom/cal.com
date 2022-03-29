import fs from "fs";
import { GetStaticPaths, GetStaticPathsResult, GetStaticPropsContext } from "next";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import path from "path";

import { getAppRegistry } from "@calcom/app-store/_appRegistry";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import App from "@components/App";

const components = {
  Slider: () => <h1>test</h1>,
  Test: () => <h1>test</h1>,
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
    console.log("error", error);
    source = singleApp.description;
  }

  const mdxSource = await serialize(source);

  return {
    props: {
      source: mdxSource,
      data: singleApp,
    },
  };
};

export default SingleAppPage;
