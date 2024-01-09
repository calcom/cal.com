"use client";

import { signIn } from "next-auth/react";
import { useRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Meta, TextField } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

function AdminView() {
  const { t } = useLocale();
  const usernameRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Meta title={t("admin")} description={t("impersonation")} borderInShellHeader />
      <form
        className="border-subtle rounded-b-xl border border-t-0 px-4 py-6 sm:px-6"
        onSubmit={(e) => {
          e.preventDefault();
          const enteredUsername = usernameRef.current?.value.toLowerCase();
          signIn("impersonation-auth", { username: enteredUsername });
        }}>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <TextField
            containerClassName="w-full"
            name={t("user_impersonation_heading")}
            addOnLeading={<>{process.env.NEXT_PUBLIC_WEBSITE_URL}/</>}
            ref={usernameRef}
            hint={t("impersonate_user_tip")}
            defaultValue={undefined}
          />
          <Button type="submit">{t("impersonate")}</Button>
        </div>
      </form>
    </>
  );
}

AdminView.getLayout = getLayout;
AdminView.PageWrapper = PageWrapper;

export default AdminView;
