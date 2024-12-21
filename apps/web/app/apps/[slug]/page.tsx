import { Prisma } from "@prisma/client";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { notFound } from "next/navigation";

import { AppRepository } from "@calcom/lib/server/repository/app";

import { getStaticProps } from "@lib/apps/[slug]/getStaticProps";

import AppView from "~/apps/[slug]/slug-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const _params = { ...params, ...searchParams };
  if (!_params.slug) {
    notFound();
  }

  const props = await getStaticProps(_params.slug as string);

  if (!props) {
    notFound();
  }

  return await _generateMetadata(
    () => props.data.name,
    () => props.data.description
  );
};

export const generateStaticParams = async () => {
  try {
    const appStore = await AppRepository.findAppStore();
    return appStore.map(({ slug }) => ({ slug }));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // Database is not available at build time, but that's ok – we fall back to resolving paths on demand
    } else {
      throw e;
    }
  }

  return [];
};

async function Page({ params, searchParams }: _PageProps) {
  const _params = { ...params, ...searchParams };
  if (!_params.slug) {
    notFound();
  }

  const props = await getStaticProps(_params.slug as string);

  if (!props) {
    notFound();
  }

  return <AppView {...props} />;
}

export default WithLayout({ getLayout: null, ServerPage: Page });

export const dynamic = "force-static";
