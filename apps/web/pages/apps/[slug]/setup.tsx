import { GetStaticPropsContext, InferGetStaticPropsType } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import _zapierMetadata from "@calcom/app-store/zapier/_metadata";
import { ZapierSetup } from "@calcom/app-store/zapier/components";
import prisma from "@calcom/prisma";

import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";

export default function SetupInformation({
  zapierInviteLink,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const slug = router.query.slug;
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

  if (slug === _zapierMetadata.name.toLowerCase() && status === "authenticated") {
    return <ZapierSetup trpc={trpc} inviteLink={zapierInviteLink} />;
  }

  return null;
}

export const getStaticPaths = async () => {
  const appStore = await prisma.app.findMany({ select: { dirName: true } });
  const paths = appStore.map((app) => {
    return app["dirName"];
  }) as string[];

  return {
    paths: paths.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true };

  const zapierAppKey = await getAppKeysFromSlug(_zapierMetadata.name.toLowerCase());

  return {
    props: {
      zapierInviteLink: (zapierAppKey["invite_link"] as string) || "",
    },
  };
};
