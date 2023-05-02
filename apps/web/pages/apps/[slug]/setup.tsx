import type { GetStaticPaths, InferGetStaticPropsType } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

import { AppSetupPage } from "@calcom/app-store/_pages/setup";
import { getStaticProps } from "@calcom/app-store/_pages/setup/_getStaticProps";
import { HeadSeo } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export default function SetupInformation(props: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const slug = router.query.slug as string;
  const { status } = useSession();

  if (status === "loading") {
    return <div className="bg-emphasis absolute z-50 flex h-screen w-full items-center" />;
  }

  if (status === "unauthenticated") {
    router.replace({
      pathname: "/auth/login",
      query: {
        callbackUrl: `/apps/${slug}/setup`,
      },
    });
  }

  return (
    <>
      {/* So that the set up page does not get indexed by search engines */}
      <HeadSeo nextSeoProps={{ noindex: true, nofollow: true }} title={`${slug} | Cal.com`} description="" />
      <AppSetupPage slug={slug} {...props} />
    </>
  );
}

SetupInformation.PageWrapper = PageWrapper;

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export { getStaticProps };
