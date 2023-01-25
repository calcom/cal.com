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
    <div className="flex h-screen bg-gray-100">
      <Head>
        <title>Something unexpected occurred | {APP_NAME}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="rtl: m-auto rounded-md bg-white p-10 text-right ltr:text-left">
        <h1 className="font-cal text-6xl text-black">500</h1>
        <h2 className="mt-6 text-2xl font-medium text-black">It&apos;s not you, it&apos;s us.</h2>
        <p className="mt-4 mb-6 max-w-2xl text-sm text-gray-600">
          Something went wrong on our end. Get in touch with our support team, and we’ll get it fixed right
          away for you.
        </p>
        {router.query.error && (
          <div className="mb-8 flex flex-col">
            <p className="mb-4 max-w-2xl text-sm text-gray-600">
              Please provide the following text when contacting support to better help you:
            </p>
            <pre className="w-full max-w-2xl whitespace-normal break-words rounded-md bg-gray-200 p-4 text-gray-900">
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
