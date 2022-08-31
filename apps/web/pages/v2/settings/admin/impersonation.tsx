import { signIn } from "next-auth/react";
import { useRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { TextField } from "@calcom/ui/form/fields";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

function AdminView() {
  const { t } = useLocale();
  const usernameRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Meta title="impersonation" description="impersonation_description" />
      <form
        className="mb-6 w-full sm:w-1/2"
        onSubmit={(e) => {
          e.preventDefault();
          const enteredUsername = usernameRef.current?.value.toLowerCase();
          signIn("impersonation-auth", { username: enteredUsername }).then((res) => {
            console.log(res);
          });
        }}>
        <TextField
          name="Impersonate User"
          addOnLeading={
            <span className="inline-flex items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
              {process.env.NEXT_PUBLIC_WEBSITE_URL}/
            </span>
          }
          ref={usernameRef}
          defaultValue={undefined}
        />
        <p className="mt-2 text-sm text-gray-500" id="email-description">
          {t("impersonate_user_tip")}
        </p>
        <div className="flex justify-end py-4">
          <Button type="submit">{t("impersonate")}</Button>
        </div>
      </form>
    </>
  );
}

AdminView.getLayout = getLayout;

export default AdminView;
