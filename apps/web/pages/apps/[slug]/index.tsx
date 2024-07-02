"use client";

import { Prisma } from "@prisma/client";
import MarkdownIt from "markdown-it";
import type { GetStaticPaths } from "next";
import Link from "next/link";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { showToast } from "@calcom/ui";

import { getStaticProps } from "@lib/apps/[slug]/getStaticProps";
import useRouterQuery from "@lib/hooks/useRouterQuery";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";
import App from "@components/apps/App";

const md = new MarkdownIt("default", { html: true, breaks: true });

function SingleAppPage(props: inferSSRProps<typeof getStaticProps>) {
  const { error, setQuery: setError } = useRouterQuery("error");
  const { t } = useLocale();
  if (error === "account_already_linked") {
    showToast(t(error), "error", { id: error });
    setError(undefined);
  }
  // If it's not production environment, it would be a better idea to inform that the App is disabled.
  if (props.isAppDisabled) {
    if (!IS_PRODUCTION) {
      // TODO: Improve disabled App UI. This is just a placeholder.
      return (
        <div className="p-2">
          This App seems to be disabled. If you are an admin, you can enable this app from{" "}
          <Link href="/settings/admin/apps" className="cursor-pointer text-blue-500 underline">
            here
          </Link>
        </div>
      );
    }

    // Disabled App should give 404 any ways in production.
    return null;
  }

  const { source, data } = props;
  return (
    <App
      name={data.name}
      description={data.description}
      isGlobal={data.isGlobal}
      slug={data.slug}
      variant={data.variant}
      type={data.type}
      dirName={data.dirName}
      logo={data.logo}
      categories={data.categories ?? [data.category]}
      author={data.publisher}
      feeType={data.feeType || "usage-based"}
      price={data.price || 0}
      commission={data.commission || 0}
      docs={data.docsUrl}
      website={data.url}
      email={data.email}
      licenseRequired={data.licenseRequired}
      teamsPlanRequired={data.teamsPlanRequired}
      descriptionItems={source.data?.items as string[] | undefined}
      isTemplate={data.isTemplate}
      dependencies={data.dependencies}
      concurrentMeetings={data.concurrentMeetings}
      paid={data.paid}
      //   tos="https://zoom.us/terms"
      //   privacy="https://zoom.us/privacy"
      body={
        <>
          <div dangerouslySetInnerHTML={{ __html: md.render(source.content) }} />
        </>
      }
    />
  );
}

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  let paths: { params: { slug: string } }[] = [];

  try {
    const appStore = await prisma.app.findMany({ select: { slug: true } });
    paths = appStore.map(({ slug }) => ({ params: { slug } }));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // Database is not available at build time, but that's ok – we fall back to resolving paths on demand
    } else {
      throw e;
    }
  }

  return {
    paths,
    fallback: "blocking",
  };
};

export { getStaticProps };

SingleAppPage.PageWrapper = PageWrapper;

export default SingleAppPage;
