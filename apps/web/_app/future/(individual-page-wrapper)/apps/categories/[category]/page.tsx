import CategoryPage from "@pages/apps/categories/[category]";
import { Prisma } from "@prisma/client";
import { _generateMetadata } from "_app/_utils";
import { notFound } from "next/navigation";
import z from "zod";

import { getAppRegistry } from "@calcom/app-store/_appRegistry";
import { APP_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `${APP_NAME} | ${APP_NAME}`,
    () => ""
  );
};

export const generateStaticParams = async () => {
  const paths = Object.keys(AppCategories);

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // Database is not available at build time. Make sure we fall back to building these pages on demand
      return [];
    } else {
      throw e;
    }
  }

  return paths.map((category) => ({ category }));
};

const querySchema = z.object({
  category: z.nativeEnum(AppCategories),
});

const getPageProps = async ({ params }: { params: Record<string, string | string[]> }) => {
  const p = querySchema.safeParse(params);

  if (!p.success) {
    return notFound();
  }

  const appQuery = await prisma.app.findMany({
    where: {
      categories: {
        has: p.data.category,
      },
    },
    select: {
      slug: true,
    },
  });

  const dbAppsSlugs = appQuery.map((category) => category.slug);

  const appStore = await getAppRegistry();

  const apps = appStore.filter((app) => dbAppsSlugs.includes(app.slug));
  return {
    apps,
  };
};

export default async function Page({ params }: { params: Record<string, string | string[]> }) {
  const { apps } = await getPageProps({ params });
  return (
    <PageWrapper getLayout={null} requiresLicense={false} nonce={undefined} themeBasis={null}>
      <CategoryPage apps={apps} />
    </PageWrapper>
  );
}

export const dynamic = "force-static";
