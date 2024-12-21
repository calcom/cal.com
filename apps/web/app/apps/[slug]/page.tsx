import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { notFound } from "next/navigation";

import { AppRepository } from "@calcom/lib/server/repository/app";
import { isPrismaAvailableCheck } from "@calcom/prisma/is-prisma-available-check";

import { getStaticProps } from "@lib/apps/[slug]/getStaticProps";

import AppView from "~/apps/[slug]/slug-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const _params = { ...params, ...searchParams };
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
  const isPrismaAvailable = await isPrismaAvailableCheck();

  if (!isPrismaAvailable) {
    // Database is not available at build time. Make sure we fall back to building these pages on demand
    return [];
  }
  const appStore = await AppRepository.findAppStore();
  return appStore.map(({ slug }) => ({ slug }));
};

async function Page({ params, searchParams }: _PageProps) {
  const _params = { ...params, ...searchParams };
  const props = await getStaticProps(_params.slug as string);

  if (!props) {
    notFound();
  }

  return <AppView {...props} />;
}

export default WithLayout({ getLayout: null, ServerPage: Page });
