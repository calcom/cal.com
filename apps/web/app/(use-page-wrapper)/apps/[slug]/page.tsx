import type { PageProps as _PageProps } from "app/_types";
import { generateAppMetadata } from "app/_utils";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";

import { runWithTenants } from "@calcom/prisma/store/prismaStore";
import { getTenantFromHost } from "@calcom/prisma/store/tenants";

import { getStaticProps } from "@lib/apps/[slug]/getStaticProps";

import AppView from "~/apps/[slug]/slug-view";

const paramsSchema = z.object({
  slug: z.string(),
});

export const generateMetadata = async ({ params }: _PageProps) => {
  const p = paramsSchema.safeParse(await params);

  if (!p.success) {
    return notFound();
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const tenant = getTenantFromHost(host);

  const props = await runWithTenants(tenant, () => getStaticProps(p.data.slug));
  if (!props) {
    return notFound();
  }
  const { name, logo, description } = props.data;

  return await generateAppMetadata(
    { slug: logo, name, description },
    () => name,
    () => description,
    undefined,
    undefined,
    `/apps/${p.data.slug}`
  );
};

async function Page({ params }: _PageProps) {
  const p = paramsSchema.safeParse(await params);

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
