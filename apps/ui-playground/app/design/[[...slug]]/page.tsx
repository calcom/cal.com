import { componentSource } from "@/app/source";
import { createTypeTable } from "fumadocs-typescript/ui";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;

  const page = componentSource.getPage(params.slug);

  if (!page) {
    notFound();
  }
  const { AutoTypeTable } = createTypeTable();

  const MDX = page.data.body;

  return (
    // @ts-expect-error idk why fumadocs doersnt like this
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>

      <DocsDescription>{page.data.description}</DocsDescription>

      <DocsBody>
        {/* @ts-expect-error idk why fumadocs doersnt like this */}
        <MDX components={{ ...defaultMdxComponents, AutoTypeTable }} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return componentSource.generateParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const page = componentSource.getPage((await params).slug);
  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: page.data.description,
  } satisfies Metadata;
}
