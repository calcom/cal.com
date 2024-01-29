import Head from "next/head";

import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, showToast } from "@calcom/ui";
import { Copy } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

export default function Error500() {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();

  return (
    <div className="bg-subtle flex h-screen">
      <Head>
        <title>Something unexpected occurred | {APP_NAME}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="rtl: bg-default m-auto rounded-md p-10 text-right ltr:text-left">
        <h1 className="font-cal text-emphasis text-6xl">500</h1>
        <h2 className="text-emphasis mt-6 text-2xl font-medium">It&apos;s not you, it&apos;s us.</h2>
        <p className="text-default mb-6 mt-4 max-w-2xl text-sm">{t("something_went_wrong_on_our_end")}</p>
        {searchParams?.get("error") && (
          <div className="mb-8 flex flex-col">
            <p className="text-default mb-4 max-w-2xl text-sm">
              {t("please_provide_following_text_to_suppport")}:
            </p>
            <pre className="bg-emphasis text-emphasis w-full max-w-2xl whitespace-normal break-words rounded-md p-4">
              {searchParams?.get("error")}
              <br />
              <Button
                color="secondary"
                className="mt-2 border-0 font-sans font-normal hover:bg-gray-300"
                StartIcon={Copy}
                onClick={() => {
                  navigator.clipboard.writeText(searchParams?.get("error") as string);
                  showToast("Link copied!", "success");
                }}>
                {t("copy")}
              </Button>
            </pre>
          </div>
        )}
        <Button href="mailto:support@cal.com">{t("contact_support")}</Button>
        <Button color="secondary" href="javascript:history.back()" className="ml-2">
          {t("go_back")}
        </Button>
      </div>
    </div>
  );
}

Error500.PageWrapper = PageWrapper;
