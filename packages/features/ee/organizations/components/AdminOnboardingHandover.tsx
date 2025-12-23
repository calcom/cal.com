"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { useOnboarding } from "@calcom/features/ee/organizations/lib/onboardingStore";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

export const AdminOnboardingHandover = () => {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();
  const isAdmin = session.data?.user.role === "ADMIN";
  const { useOnboardingStore } = useOnboarding();
  const { onboardingId, orgOwnerEmail } = useOnboardingStore();

  if (!isAdmin) {
    return null;
  }

  // Admin handover page should ONLY use store data, not DB query
  // The DB query returns the admin's own onboarding, not the one being handed over
  if (!onboardingId) {
    return <Alert severity="error" title={t("error")} message="No onboarding ID found. Please try again." />;
  }

  const onboardingUrl = `${WEBAPP_URL}/settings/organizations/new/resume?onboardingId=${onboardingId}`;

  return (
    <div className="stack-y-6">
      {/* Instructions Card */}
      <div className="bg-subtle rounded-lg p-6">
        <h3 className="text-emphasis mb-2 text-lg font-medium">{t("next_steps")}</h3>
        <p className="text-default mb-4 text-sm">
          Send the following link to <strong>{orgOwnerEmail}</strong> so they can complete the organization
          setup:
        </p>

        <div className="stack-y-3">
          <div className="bg-default flex items-center gap-2 rounded-md border p-3">
            <code className="text-default flex-1 truncate font-mono text-sm" data-testid="onboarding-url">
              {onboardingUrl}
            </code>
            <Button
              data-testid="copy-onboarding-url"
              type="button"
              size="sm"
              color="secondary"
              onClick={() => {
                navigator.clipboard.writeText(onboardingUrl);
                showToast(t("link_copied"), "success");
              }}
              StartIcon="clipboard">
              {t("copy")}
            </Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button color="minimal" StartIcon="arrow-left" onClick={() => router.push("/settings/organizations")}>
          {t("back")}
        </Button>
        <Button
          color="primary"
          onClick={() => {
            router.push("/event-types");
          }}>
          {t("done")}
        </Button>
      </div>
    </div>
  );
};
