import { signIn } from "next-auth/react";
import { useRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, getAdminLayout as getLayout, Meta, TextField } from "@calcom/ui";

function AdminView() {
  const { t } = useLocale();
  const usernameRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Meta title="Admin" description="Impersonation" />
      <form
        className="mb-6 w-full sm:w-1/2"
        onSubmit={(e) => {
          e.preventDefault();
          const enteredUsername = usernameRef.current?.value.toLowerCase();
          signIn("impersonation-auth", { username: enteredUsername });
        }}>
        <div className="flex items-center space-x-2">
          <TextField
            containerClassName="w-full"
            name="Impersonate User"
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

export default AdminView;
