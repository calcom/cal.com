import { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import { useRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Meta, TextField } from "@calcom/ui";

import { getLayout } from "@components/auth/layouts/AdminLayout";

import { ssrInit } from "@server/lib/ssr";

function AdminView() {
  const { t } = useLocale();
  const usernameRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Meta title={t("admin")} description={t("impersonation")} />
      <form
        className="mb-6 w-full sm:w-1/2"
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default AdminView;
