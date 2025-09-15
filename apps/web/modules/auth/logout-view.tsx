"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
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
  if (status === "authenticated") signOut({ redirect: false });
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
    <div className="flex min-h-screen items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
      <div className="border-subtle w-full max-w-lg rounded-2xl border p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mb-8 flex items-center justify-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">Cal ID</span>
          </div>
        </div>

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
            className="w-full justify-center py-3"
            loading={btnLoading}>
            {t("go_back_login")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Logout;
