import { componentSource } from "@/app/source";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Toaster } from "react-hot-toast";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;

  const page = componentSource.getPage(params.slug);

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;

  return (
    <div>
      <Toaster />
      <h1>{page.data.title}</h1>
      {page.data.description && <p>{page.data.description}</p>}

      <TooltipProvider>
        <MDX />
      </TooltipProvider>
    </div>
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
