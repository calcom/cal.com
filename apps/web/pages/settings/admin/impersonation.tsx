"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRef, useEffect } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Meta, TextField } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

function AdminView() {
  const { t } = useLocale();
  const usernameRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  const username = searchParams?.get("username")?.toLowerCase();

  useEffect(() => {
    if (username) {
      const enteredUsername = username.toLowerCase();
      signIn("impersonation-auth", {
        username: enteredUsername,
        callbackUrl: `${WEBAPP_URL}/event-types`,
      });
    }
  }, [username]);

  return (
    <>
      <Meta title={t("admin")} description={t("impersonation")} />
      <form
        className="mb-6 w-full sm:w-1/2"
        onSubmit={(e) => {
          e.preventDefault();
          const enteredUsername = usernameRef.current?.value.toLowerCase();
          signIn("impersonation-auth", {
            username: enteredUsername,
            callbackUrl: `${WEBAPP_URL}/event-types`,
          });
        }}>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <TextField
            containerClassName="w-full"
            name={t("user_impersonation_heading")}
            addOnLeading={<>{process.env.NEXT_PUBLIC_WEBSITE_URL}/</>}
            ref={usernameRef}
            hint={t("impersonate_user_tip")}
            defaultValue={undefined}
            data-testid="admin-impersonation-input"
          />
          <Button type="submit" data-testid="impersonation-submit">
            {t("impersonate")}
          </Button>
        </div>
      </form>
    </>
  );
}

AdminView.getLayout = getLayout;
AdminView.PageWrapper = PageWrapper;

export default AdminView;
