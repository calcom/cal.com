import Head from "next/head";
import { useRouter } from "next/router";

import { APP_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

export default function Error500() {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div className="flex h-screen">
      <Head>
        <title>Something unexpected occurred | {APP_NAME}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="m-auto text-center">
        <h1 className="font-cal text-[250px] text-gray-900">
          5
          {
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/error.svg" className="-mt-10 inline w-60" alt="0" />
          }
          0
        </h1>
        <h2 className="mb-2 -mt-16 text-3xl text-gray-600">It&apos;s not you, it&apos;s us.</h2>
        <p className="mb-4 max-w-2xl text-gray-500">
          Something went wrong on our end. Get in touch with our support team, and we’ll get it fixed right
          away for you.
        </p>
        <div className="flex flex-col items-center">
          <p className="mb-4 max-w-2xl text-gray-500">
            Please provide the following text when contacting support to better help you:
          </p>
          {router.query.error && (
            <pre className="mb-4 w-fit max-w-2xl whitespace-normal break-words rounded-md bg-gray-300 p-3 text-gray-900">
              {router.query.error}
            </pre>
          )}
        </div>
        <Button href={`${WEBSITE_URL}/support`}>{t("contact_support")}</Button>
        <Button color="secondary" href="javascript:history.back()" className="ml-2">
          Go back
        </Button>
      </div>
    </div>
  );
}
