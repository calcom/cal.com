"use client";

import type { ParsedUrlQuery } from "node:querystring";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getI18nEditAttributes } from "@calcom/lib/i18nEditMode";
import { Button } from "@calcom/ui/components/button";
import AuthContainer from "@components/ui/AuthContainer";
import { CheckIcon } from "@coss/ui/icons";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export type PageProps = {
  query: ParsedUrlQuery;
};

export function Logout(props: PageProps) {
  const [btnLoading, setBtnLoading] = useState<boolean>(false);
  const { status } = useSession();
  if (status === "authenticated") signOut({ redirect: false });
  const router = useRouter();
  useEffect(() => {
    if (props.query?.survey === "true") {
      router.push(`${WEBSITE_URL}/cancellation`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.query?.survey]);
  const { t, i18n } = useLocale();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const i18nEdit = (key: string) => getI18nEditAttributes(key, locale);

  const message = () => {
    if (props.query?.passReset === "true") return "reset_your_password";
    if (props.query?.emailChange === "true") return "email_change";
    return "hope_to_see_you_soon";
  };

  const navigateToLogin = () => {
    setBtnLoading(true);
    router.push("/auth/login");
  };

  return (
    <AuthContainer showLogo>
      <div className="mb-4">
        <div className="bg-cal-success mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <CheckIcon className="h-6 w-6 text-green-600" />
        </div>
        <div className="mt-3 text-center sm:mt-5">
          <h3
            {...i18nEdit("youve_been_logged_out")}
            className="text-emphasis text-lg font-medium leading-6"
            id="modal-title">
            {t("youve_been_logged_out")}
          </h3>
          <div className="mt-2">
            <p {...i18nEdit(message())} className="text-subtle text-sm">
              {t(message())}
            </p>
          </div>
        </div>
      </div>
      <Button
        data-testid="logout-btn"
        onClick={navigateToLogin}
        className="flex w-full justify-center"
        loading={btnLoading}>
        <span {...i18nEdit("go_back_login")}>{t("go_back_login")}</span>
      </Button>
    </AuthContainer>
  );
}

export default Logout;
