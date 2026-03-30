import { notFound } from "next/navigation";

import { _generateMetadata } from "app/_utils";

import { registry } from "@calcom/features/admin-dataview/registry";

import { StudioLayout } from "~/admin-dataview/components/StudioLayout";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return registry.getAll().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const table = registry.getBySlug(slug);
  if (!table) return {};
  return await _generateMetadata(
    () => `${table.displayNamePlural} — Data Studio`,
    () => table.description,
    undefined,
    undefined,
    `/admin/data/${slug}`
  );
}

export default async function AdminDataTablePage({ params }: Props) {
  const { slug } = await params;

  if (!registry.getBySlug(slug)) {
    notFound();
  }

  return <StudioLayout slug={slug} />;
}
