"use client";

import Link from "next/link";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { showToast } from "@calcom/ui/components/toast";

import type { AppDataProps } from "@lib/apps/[slug]/getStaticProps";
import useRouterQuery from "@lib/hooks/useRouterQuery";

import App from "@components/apps/App";

function SingleAppPage(props: AppDataProps) {
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
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: markdownToSafeHTML(source.content) }} />
        </>
      }
    />
  );
}

export default SingleAppPage;
