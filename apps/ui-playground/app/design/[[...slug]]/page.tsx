import { componentSource } from "@/app/source";
import { Status } from "@/components/Status";
import { getRecordStatus } from "@/lib/airtable";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { createTypeTable } from "fumadocs-typescript/ui";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Toaster } from "react-hot-toast";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;

  const page = componentSource.getPage(params.slug);

  if (!page) {
    notFound();
  }
  const { AutoTypeTable } = createTypeTable();

  const MDX = page.data.body;

  let status = null;
  if (page.data.airtableId) {
    status = await getRecordStatus(page.data.airtableId);
  }

  return (
    <>
      {/* @ts-expect-error idk why fumadocs doersnt like this */}
      <DocsPage toc={page.data.toc} full={page.data.full}>
        <Toaster />
        <DocsTitle>{page.data.title}</DocsTitle>

        <DocsDescription>{page.data.description}</DocsDescription>

        {status && (
          <div className="mb-4">
            <Status
              // @ts-expect-error not typing this as its only here for review purposes
              designStatus={status.designStatus}
              // @ts-expect-error not typing this as its only here for review purposes
              devStatus={status.devStatus}
              airtableId={page.data.airtableId}
              figmalink={status.figmaLink}
            />
          </div>
        )}

        <DocsBody>
          <TooltipProvider>
            {/* @ts-expect-error idk why fumadocs doersnt like this */}
            <MDX components={{ ...defaultMdxComponents, AutoTypeTable }} />
          </TooltipProvider>
        </DocsBody>
      </DocsPage>
    </>
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
