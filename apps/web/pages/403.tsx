import Head from "next/head";

import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export default function AccessDenied() {
  const { t } = useLocale();

  return (
    <div className="bg-subtle flex h-screen">
      <Head>
        <title>{`${t("access_denied")} | ${APP_NAME}`}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="rtl: bg-default m-auto rounded-md p-10 text-right ltr:text-left">
        <h1 className="font-cal text-emphasis text-6xl">403</h1>
        <h2 className="text-emphasis mt-6 text-2xl font-medium">{t("dont_have_access_this_page")}</h2>
        <p className="text-default mb-6 mt-4 max-w-2xl text-sm">
          {t("you_need_admin_or_owner_privileges_to_access")}
        </p>
        <Button href={WEBAPP_URL}>{t("go_back_home")}</Button>
      </div>
    </div>
  );
}

AccessDenied.PageWrapper = PageWrapper;
