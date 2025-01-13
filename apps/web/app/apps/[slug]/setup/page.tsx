import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getServerSideProps } from "@calcom/app-store/_pages/setup/_getServerSideProps";

import Page, { type PageProps } from "~/apps/[slug]/setup/setup-view";

const paramsSchema = z.object({
  slug: z.string(),
});

export const generateMetadata = async ({ params }: _PageProps) => {
  const p = paramsSchema.safeParse(params);

  if (!p.success) {
    return notFound();
  }
  const metadata = await _generateMetadata(
    () => `${p.data.slug}`,
    () => ""
  );
  return {
    ...metadata,
    robots: {
      follow: false,
      index: false,
    },
  };
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, Page, getData });
