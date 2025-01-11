import type { PageProps as _PageProps } from "app/_types";
import { generateAppMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AppRepository } from "@calcom/lib/server/repository/app";
import { isPrismaAvailableCheck } from "@calcom/prisma/is-prisma-available-check";

import { getStaticProps } from "@lib/apps/[slug]/getStaticProps";

import AppView from "~/apps/[slug]/slug-view";

const paramsSchema = z.object({
  slug: z.string(),
});

export const generateMetadata = async ({ params }: _PageProps) => {
  const p = paramsSchema.safeParse(params);

  if (!p.success) {
    return notFound();
  }

  const props = await getStaticProps(p.data.slug);

  if (!props) {
    notFound();
  }
  const { name, logo, description } = props.data;

  return await generateAppMetadata(
    { slug: logo, name, description },
    () => name,
    () => description
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

async function Page({ params }: _PageProps) {
  const p = paramsSchema.safeParse(params);

  if (!p.success) {
    return notFound();
  }

  const props = await getStaticProps(p.data.slug);

  if (!props) {
    notFound();
  }

  return <AppView {...props} />;
}

export default WithLayout({ getLayout: null, ServerPage: Page });

export const dynamic = "force-static";
