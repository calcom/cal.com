import type { GetStaticPaths, InferGetStaticPropsType } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

import { AppSetupPage } from "@calcom/app-store/_pages/setup";
import { getStaticProps } from "@calcom/app-store/_pages/setup/_getStaticProps";

export default function SetupInformation(props: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const slug = router.query.slug as string;
  const { status } = useSession();

  if (status === "loading") {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  if (status === "unauthenticated") {
    router.replace({
      pathname: "/auth/login",
      query: {
        callbackUrl: `/apps/${slug}/setup`,
      },
    });
  }

  return <AppSetupPage slug={slug} {...props} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export { getStaticProps };
