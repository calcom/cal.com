"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { Logo } from "@calid/features/ui/components/logo";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { ParsedUrlQuery } from "querystring";
import { useEffect, useState } from "react";

import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export type PageProps = {
  query: ParsedUrlQuery;
};

export function Logout(props: PageProps) {
  const [btnLoading, setBtnLoading] = useState<boolean>(false);
  const { status } = useSession();
  // if (status === "authenticated") signOut({ redirect: false });
  const router = useRouter();
  useEffect(() => {
    if (props.query?.survey === "true") {
      router.push(`${WEBSITE_URL}/cancellation`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.query?.survey]);
  const { t } = useLocale();

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
      <div className="dark:bg-default flex  min-h-screen flex-col items-center justify-center bg-[#F0F5FF] p-4">
        <div className="p-10 bg-default dark:border-gray-550 w-full max-w-7xl overflow-hidden rounded-3xl border shadow-xl md:max-w-[600px] dark:shadow-none">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Icon name="check" className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-emphasis text-2xl font-bold">{t("youve_been_logged_out")}</h1>
          <p className="text-subtle text-md leading-relaxed">{t(message())}</p>
        </div>

        <div className="mt-4">
          <Button
            data-testid="logout-btn"
            onClick={navigateToLogin}
            color="primary"
            className="bg-active border-active dark:border-default w-full justify-center py-3 dark:bg-gray-200"
            loading={btnLoading}>
            {t("go_back_login")}
          </Button>
        </div>
      </div>
      <div className="mt-8">
        <div className="mb-8 flex justify-center">
          <Logo small icon />
        </div>
      </div>
    </div>
  );
}

export default Logout;
