import type { PageProps as _PageProps } from "app/_types";
import { generateAppMetadata } from "app/_utils";
import { notFound } from "next/navigation";
import { z } from "zod";

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

export default Page;
