import Head from "next/head";
import { useRouter } from "next/router";

import { APP_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, showToast } from "@calcom/ui";
import { FiCopy } from "@calcom/ui/components/icon";

export default function Error500() {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div className="bg-subtle flex h-screen">
      <Head>
        <title>Something unexpected occurred | {APP_NAME}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="rtl: bg-default m-auto rounded-md p-10 text-right ltr:text-left">
        <h1 className="font-cal text-emphasis text-6xl">500</h1>
        <h2 className="text-emphasis mt-6 text-2xl font-medium">It&apos;s not you, it&apos;s us.</h2>
        <p className="text-default mt-4 mb-6 max-w-2xl text-sm">
          Something went wrong on our end. Get in touch with our support team, and we’ll get it fixed right
          away for you.
        </p>
        {router.query.error && (
          <div className="mb-8 flex flex-col">
            <p className="text-default mb-4 max-w-2xl text-sm">
              Please provide the following text when contacting support to better help you:
            </p>
            <pre className="bg-emphasis text-emphasis w-full max-w-2xl whitespace-normal break-words rounded-md p-4">
              {router.query.error}
              <br />
              <Button
                color="secondary"
                className="mt-2 border-0 font-sans font-normal hover:bg-gray-300"
                StartIcon={FiCopy}
                onClick={() => {
                  navigator.clipboard.writeText(router.query.error as string);
                  showToast("Link copied!", "success");
                }}>
                {t("copy")}
              </Button>
            </pre>
          </div>
        )}
        <Button href={`${WEBSITE_URL}/support`}>{t("contact_support")}</Button>
        <Button color="secondary" href="javascript:history.back()" className="ml-2">
          Go back
        </Button>
      </div>
    </div>
  );
}
