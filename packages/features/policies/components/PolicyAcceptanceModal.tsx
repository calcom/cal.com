"use client";

import { useState } from "react";
import { useFlags } from "@calcom/features/flags/hooks";
import { useGeo } from "@calcom/web/app/GeoContext";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { PolicyType } from "@calcom/prisma/enums";


const POLICY_CONFIG: Record<
  PolicyType,
  {
    titleKey: string;
    learnMoreUrl: string;
  } | null
> = {
  [PolicyType.PRIVACY_POLICY]: {
    titleKey: "privacy_policy_updated",
    learnMoreUrl: "https://cal.com/privacy",
  },
};

export function PolicyAcceptanceModal() {
  const flags = useFlags();
  const { t } = useLocale();
  const { country } = useGeo();
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: me } = trpc.viewer.me.get.useQuery();
  const policyData = me?.policyAcceptance;

  const utils = trpc.useUtils();

  const acceptMutation = trpc.viewer.policy.accept.useMutation({
    onSuccess: () => {
      showToast(t("policy_accepted_successfully"), "success");
      setIsDismissed(true);
      utils.viewer.me.get.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  if (!flags["policy-acceptance-modal"]) {
    return null;
  }

  const isUS = country.toUpperCase() === "US";

  if (!policyData || isDismissed) {
    return null;
  }

  const policyConfig = POLICY_CONFIG[policyData.type];
  if (!policyConfig) {
    return null;
  }

  const description = isUS ? policyData.description : policyData.descriptionNonUS;

  const handleAccept = () => {
    acceptMutation.mutate({
      type: policyData.type,
      version: policyData.version,
    });
  };

  const handleClose = () => {
    if (isUS) {
      // For US users, dismissal = acceptance
      handleAccept();
    }
    // For non-US users, do nothing - must accept explicitly
  };

  if (!isUS) {
    return (
      <Dialog open={true} onOpenChange={() => { }}>
        <DialogContent
          data-testid="policy-acceptance-modal"
          className="p-0!"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}>
          <div>
            <div className="flex flex-col gap-1 p-6 mb-6">
              <div
                data-testid="policy-modal-title"
                className="text-emphasis text-xl leading-6 font-semibold">
                {t(policyConfig.titleKey)}
              </div>
              <p
                data-testid="policy-modal-description"
                className="text-subtle text-sm font-normal leading-4 wrap-break-word">
                {description}
              </p>
            </div>

            <div className="w-full bg-muted border-subtle flex items-center justify-end gap-2 rounded-b-2xl border-t px-6 py-5">
              <Button
                data-testid="policy-learn-more-button"
                color="minimal"
                href={policyConfig.learnMoreUrl}
                disabled={acceptMutation.isPending}>
                {t("learn_more")}
              </Button>
              <Button
                data-testid="policy-accept-button"
                type="button"
                loading={acceptMutation.isPending}
                disabled={acceptMutation.isPending}
                onClick={handleAccept}>
                {t("accept")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md" data-testid="policy-acceptance-banner">
      <div className="bg-default animate-in slide-in-from-bottom-5 rounded-lg border p-4 shadow-lg">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 data-testid="policy-banner-title" className="text-emphasis text-sm font-medium">
                {t(policyConfig.titleKey)}
              </h3>
              <p data-testid="policy-banner-description" className="text-subtle mt-2 text-sm leading-relaxed">
                {description}
              </p>
            </div>
            <Button
              data-testid="policy-banner-close-button"
              onClick={handleClose}
              disabled={acceptMutation.isPending}
              color="minimal"
              StartIcon="x"
              className="text-muted hover:text-emphasis -mt-1 shrink-0" />
          </div>

          <div>
            <Button
              data-testid="policy-learn-more-button"
              color="primary"
              href={policyConfig.learnMoreUrl}
              disabled={acceptMutation.isPending}
              className="w-full sm:w-auto">
              {t("learn_more")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
