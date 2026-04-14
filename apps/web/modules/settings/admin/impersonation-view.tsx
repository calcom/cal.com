"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRef, useEffect, useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/i18n/useLocale";
import { addRecentImpersonation } from "@calcom/lib/recentImpersonations";

import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Field, FieldDescription } from "@coss/ui/components/field";
import { Group } from "@coss/ui/components/group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@coss/ui/components/input-group";

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

  const handleQuickImpersonate = (impersonateUsername: string) => {
    if (usernameRef.current) {
      usernameRef.current.value = impersonateUsername;
    }
    addRecentImpersonation(impersonateUsername);
    setRefreshKey((prev) => prev + 1);
    signIn("impersonation-auth", {
      username: impersonateUsername.toLowerCase(),
      callbackUrl: `${WEBAPP_URL}/event-types`,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>{t("user_impersonation_heading")}</CardFrameTitle>
        </CardFrameHeader>
        <Card>
          <CardPanel>
            <form onSubmit={handleSubmit}>
              <Field>
                <Group aria-label={t("user_impersonation_heading")} className="w-full gap-2 max-sm:flex-col">
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <InputGroupText>{process.env.NEXT_PUBLIC_WEBSITE_URL}/</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      ref={usernameRef}
                      aria-label={t("impersonate")}
                      className="*:[input]:ps-0!"
                      placeholder={t("username")}
                      type="text"
                      data-testid="admin-impersonation-input"
                    />
                  </InputGroup>
                  <div>
                    <Button type="submit" data-testid="impersonation-submit">
                      {t("impersonate")}
                    </Button>
                  </div>
                </Group>
                <FieldDescription>{t("impersonate_user_tip")}</FieldDescription>
              </Field>
            </form>
          </CardPanel>
        </Card>
      </CardFrame>
      <RecentImpersonationsList key={refreshKey} onImpersonate={handleQuickImpersonate} />
    </div>
  );
};

export default ImpersonationView;
