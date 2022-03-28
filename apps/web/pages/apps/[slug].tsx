import { GetStaticPaths, GetStaticPathsResult, GetStaticPropsContext } from "next";

import { getAppRegistry } from "@calcom/app-store/_appRegistry";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import App from "@components/App";

function SingleAppPage({ data }: inferSSRProps<typeof getStaticProps>) {
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
      body={data.description}
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

  return {
    props: {
      data: singleApp,
    },
  };
};

export default SingleAppPage;
