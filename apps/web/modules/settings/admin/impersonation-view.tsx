"use client";

import { Button } from "@calid/features/ui/components/button";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRef, useEffect } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TextField } from "@calcom/ui/components/form";

const ImpersonationView = () => {
  const { t } = useLocale();
  const usernameRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  const username = searchParams?.get("username")?.toLowerCase();

  useEffect(() => {
    if (username) {
      const enteredUsername = username.toLowerCase();
      signIn("impersonation-auth", {
        username: enteredUsername,
        callbackUrl: `${WEBAPP_URL}/home`,
      });
    }
  }, [username]);

  return (
    <form
      className="mb-6 w-full"
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
          containerClassName="w-full [&_input:-webkit-autofill]:!shadow-[0_0_0_1000px_white_inset] dark:[&_input:-webkit-autofill]:!shadow-[0_0_0_1000px_rgb(39_39_42)_inset]"
          name={t("user_impersonation_heading")}
          addOnLeading={<>{process.env.NEXT_PUBLIC_WEBSITE_URL}/</>}
          ref={usernameRef}
          hint={t("impersonate_user_tip")}
          defaultValue={undefined}
          data-testid="admin-impersonation-input"
        />
        <Button type="submit" data-testid="impersonation-submit" className="mt-[-8px]">
          {t("impersonate")}
        </Button>
      </div>
    </form>
  );
};

export default ImpersonationView;
