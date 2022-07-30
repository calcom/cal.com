import { GetStaticPaths, InferGetStaticPropsType } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

import { AppSetupPage } from "@calcom/app-store/_pages/setup";
import { getStaticProps } from "@calcom/app-store/_pages/setup/_getStaticProps";
import Loader from "@calcom/ui/Loader";

export default function SetupInformation(props: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const slug = router.query.slug as string;
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200">
        <Loader />
      </div>
    );
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

export const getStaticPaths = async () => {
  const appStore = await prisma.app.findMany({ select: { slug: true } });
  const paths = appStore.filter((a) => a.slug in AppSetupMap).map((app) => app.slug);

  return {
    paths: paths.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export { getStaticProps };
