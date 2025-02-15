"use client";

import { useSession } from "next-auth/react";

import { useOnboarding } from "@calcom/features/ee/organizations/lib/onboardingStore";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, showToast } from "@calcom/ui";

export const AdminOnboardingHandover = () => {
  const { t } = useLocale();
  const session = useSession();
  const isAdmin = session.data?.user.role === "ADMIN";

  const useOnboardingStore = useOnboarding();
  const { onboardingId: onboardingIdFromStore } = useOnboardingStore();

  if (!isAdmin) {
    return null;
  }

  const onboardingUrl = `${WEBAPP_URL}/settings/organizations/new/about?onboardingId=${onboardingIdFromStore}`;

  return (
    <div className="bg-subtle rounded-md p-4">
      <div className="flex items-center gap-2">
        <span className="text-emphasis font-medium">Onboarding URL</span>
        <code
          data-testid="onboarding-url"
          className="bg-default text-default flex w-full items-center truncate rounded-md px-3 py-2 font-mono text-sm">
          {onboardingUrl}
        </code>
        <Button
          data-testid="copy-onboarding-url"
          type="button"
          variant="icon"
          color="secondary"
          className="h-9 w-9"
          onClick={() => {
            navigator.clipboard.writeText(onboardingUrl);
            showToast(t("link_copied"), "success");
          }}
          StartIcon="clipboard"
          tooltip={t("copy_to_clipboard")}
        />
      </div>
    </div>
  );
};
