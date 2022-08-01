import { signIn } from "next-auth/react";
import { useRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { TextField } from "@calcom/ui/form/fields";
import ShellSettings from "@calcom/ui/v2/ShellSettings";

function AdminView() {
  const { t } = useLocale();
  const usernameRef = useRef<HTMLInputElement>(null);

  return (
    <div className="divide-y divide-gray-200">
      <div className="py-6 lg:pb-8">
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
      </div>
      <hr className="mt-8" />
    </div>
  );
}

export default function Admin() {
  const { t } = useLocale();

  return (
    <ShellSettings heading={t("admin")}>
      <AdminView />
    </ShellSettings>
  );
}
