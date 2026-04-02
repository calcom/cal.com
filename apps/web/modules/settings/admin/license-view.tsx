"use client";

import { IS_CALCOM } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

export default function LicenseView() {
  const { t } = useLocale();
  const [billingEmail, setBillingEmail] = useState("");

  const resendEmailMutation = trpc.viewer.admin.resendPurchaseCompleteEmail.useMutation({
    onSuccess: () => {
      showToast(t("admin_license_resend_success"), "success");
    },
    onError: (error) => {
      showToast(error.message || t("admin_license_resend_error"), "error");
    },
  });

  const billingPortalMutation = trpc.viewer.admin.billingPortalLink.useMutation({
    onSuccess: (data) => {
      if (!data?.url) {
        showToast(t("admin_license_portal_missing_url"), "error");
        return;
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    },
    onError: (error) => {
      showToast(error.message || t("admin_license_portal_error"), "error");
    },
  });

  const showResendSection = IS_CALCOM;

  return (
    <div className="flex flex-col gap-4">
      {showResendSection && (
        <PanelCard title={t("admin_license_resend_title")} subtitle={t("admin_license_resend_description")}>
          <div className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <TextField
                containerClassName="w-full"
                label={t("admin_license_billing_email_label")}
                name="billingEmail"
                type="email"
                placeholder={t("admin_license_billing_email_placeholder")}
                value={billingEmail}
                onChange={(event) => setBillingEmail(event.target.value)}
              />
              <Button
                type="button"
                loading={resendEmailMutation.isPending}
                disabled={!billingEmail.trim()}
                onClick={() => {
                  resendEmailMutation.mutate({
                    billingEmail: billingEmail.trim(),
                  });
                }}>
                {t("admin_license_resend_button")}
              </Button>
            </div>
          </div>
        </PanelCard>
      )}

      <PanelCard title={t("admin_license_portal_title")} subtitle={t("admin_license_portal_description")}>
        <div className="p-4">
          <Button
            type="button"
            loading={billingPortalMutation.isPending}
            onClick={() => billingPortalMutation.mutate({})}>
            {t("admin_license_portal_button")}
          </Button>
        </div>
      </PanelCard>
    </div>
  );
}
