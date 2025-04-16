import { _generateMetadata, getTranslate } from "app/_utils";

import { APP_NAME } from "@calcom/lib/constants";
import { Button } from "@calcom/ui/components/button";

import CopyButton from "./copy-button";

export const generateMetadata = () =>
  _generateMetadata(
    (t) => `${t("something_unexpected_occurred")} | ${APP_NAME}`,
    () => "",
    undefined,
    undefined,
    "/500"
  );

async function Error500({ searchParams }: { searchParams: { error?: string } }) {
  const t = await getTranslate();

  return (
    <div className="bg-subtle flex h-screen">
      <div className="rtl: bg-default m-auto rounded-md p-10 text-right ltr:text-left">
        <h1 className="font-cal text-emphasis text-6xl">500</h1>
        <h2 className="text-emphasis mt-6 text-2xl font-medium">{t("500_error_message")}</h2>
        <p className="text-default mb-6 mt-4 max-w-2xl text-sm">{t("something_went_wrong_on_our_end")}</p>
        {searchParams?.error && (
          <div className="mb-8 flex flex-col">
            <p className="text-default mb-4 max-w-2xl text-sm">
              {t("please_provide_following_text_to_suppport")}:
            </p>
            <pre className="bg-emphasis text-emphasis w-full max-w-2xl whitespace-normal break-words rounded-md p-4">
              {searchParams.error}
              <br />
              <CopyButton error={searchParams.error} />
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

export default Error500;
