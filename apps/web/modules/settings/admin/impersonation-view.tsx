"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRef, useEffect, useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { addRecentImpersonation } from "@calcom/lib/recentImpersonations";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { TextField } from "@calcom/ui/components/form";

import RecentImpersonationsList from "../../../components/settings/admin/RecentImpersonationsList";

const ImpersonationView = () => {
  const { t } = useLocale();
  const usernameRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);

  const username = searchParams?.get("username")?.toLowerCase();

  useEffect(() => {
    if (username) {
      const enteredUsername = username.toLowerCase();
      addRecentImpersonation(enteredUsername);
      signIn("impersonation-auth", {
        username: enteredUsername,
        callbackUrl: `${WEBAPP_URL}/event-types`,
      });
    }
  }, [username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredUsername = usernameRef.current?.value.toLowerCase();
    if (enteredUsername) {
      addRecentImpersonation(enteredUsername);
      setRefreshKey((prev) => prev + 1);
      signIn("impersonation-auth", {
        username: enteredUsername,
        callbackUrl: `${WEBAPP_URL}/event-types`,
      });
    }
  };

  const handleQuickImpersonate = (username: string) => {
    if (usernameRef.current) {
      usernameRef.current.value = username;
    }
    addRecentImpersonation(username);
    setRefreshKey((prev) => prev + 1);
    signIn("impersonation-auth", {
      username: username.toLowerCase(),
      callbackUrl: `${WEBAPP_URL}/event-types`,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <PanelCard title={t("user_impersonation_heading")} subtitle={t("impersonate_user_tip")}>
        <form className="p-4" onSubmit={handleSubmit}>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <TextField
              containerClassName="w-full"
              name=""
              addOnLeading={<>{process.env.NEXT_PUBLIC_WEBSITE_URL}/</>}
              ref={usernameRef}
              defaultValue={undefined}
              data-testid="admin-impersonation-input"
            />
            <Button type="submit" data-testid="impersonation-submit">
              {t("impersonate")}
            </Button>
          </div>
        </form>
      </PanelCard>
      <RecentImpersonationsList key={refreshKey} onImpersonate={handleQuickImpersonate} />
    </div>
  );
};

export default ImpersonationView;
