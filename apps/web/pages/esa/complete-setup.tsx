import type { InferGetStaticPropsType } from "next";
import Head from "next/head";
import { useSearchParams } from "next/navigation";

import { classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import PageWrapper from "@components/PageWrapper";
import { ZohoConnectionSetupPage } from "@components/apps/ZohoConnection";
import { CheckCircleIcon } from "@components/ui/CheckCircleIcon";

export { getServerSideProps } from "@lib/complete-setup/getServerSideProps";

export type PageProps = InferGetStaticPropsType<typeof getServerSideProps>;

const CompleteSetupPage = ({ zohoCalendar }: PageProps) => {
  const { t } = useLocale();
  const params = useSearchParams();

  const setupCompleted = params?.get("setupCompleted") === "true";

  const completeSetupToken = params?.get("completeSetupToken");
  return (
    <div
      className={classNames(
        "dark:bg-brand dark:text-brand-contrast text-emphasis min-h-screen [--cal-brand:#111827] dark:[--cal-brand:#FFFFFF]",
        "[--cal-brand-emphasis:#101010] dark:[--cal-brand-emphasis:#e1e1e1]",
        "[--cal-brand-subtle:#9CA3AF]",
        "[--cal-brand-text:#FFFFFF]  dark:[--cal-brand-text:#000000]"
      )}
      key="complete-setup"
      data-testid="complete-setup">
      <Head>
        <title>{`${APP_NAME} - ${t("complete_setup")}`}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {setupCompleted ? (
        <div className="mx-auto py-6 sm:px-4 md:py-24">
          <div className="relative">
            <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
              <div className="mb-auto mt-8 w-full sm:mx-auto">
                <div className="bg-default dark:bg-muted border-subtle mx-2 w-full rounded-md border px-4 py-10 sm:px-10">
                  <div className="center mb-3 w-full">
                    <CheckCircleIcon className="mx-auto w-16" />
                  </div>
                  <p className="font-cal mb-3 w-full text-center text-[28px] font-medium leading-7">
                    {t("scheduling_setup_success")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ZohoConnectionSetupPage completeSetupToken={completeSetupToken} zohoCalendar={zohoCalendar} />
      )}
    </div>
  );
};

CompleteSetupPage.PageWrapper = PageWrapper;

export default CompleteSetupPage;
