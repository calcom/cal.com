import { Prisma } from "@prisma/client";
import { withAppDirSsg } from "app/WithAppDirSsg";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { AppRepository } from "@calcom/lib/server/repository/app";

import { getStaticProps } from "@lib/apps/[slug]/getStaticProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import type { PageProps } from "~/apps/[slug]/slug-view";
import Page from "~/apps/[slug]/slug-view";

const getData = withAppDirSsg<PageProps>(getStaticProps, "future/apps/[slug]");

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const legacyContext = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const res = await getData(legacyContext);

  return await _generateMetadata(
    () => res?.data.name ?? "",
    () => res?.data.description ?? ""
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

export default WithLayout({ getLayout: null, Page, getData });

export const dynamic = "force-static";
