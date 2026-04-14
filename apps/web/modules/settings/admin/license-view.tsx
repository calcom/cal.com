"use client";

import { IS_CALCOM } from "@calcom/lib/constants";
import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Group } from "@coss/ui/components/group";
import { Input } from "@coss/ui/components/input";
import { toastManager } from "@coss/ui/components/toast";
import { ExternalLinkIcon } from "@coss/ui/icons";
import { useState } from "react";
import { DeploymentInfoSheet } from "./components/DeploymentInfoSheet";

export default function LicenseView() {
  const { t } = useLocale();
  const [billingEmail, setBillingEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetEmail, setSheetEmail] = useState("");

  const resendEmailMutation = trpc.viewer.admin.resendPurchaseCompleteEmail.useMutation({
    onSuccess: () => {
      toastManager.add({ title: t("admin_license_resend_success"), type: "success" });
    },
    onError: (error) => {
      toastManager.add({ title: error.message || t("admin_license_resend_error"), type: "error" });
    },
  });

  const billingPortalMutation = trpc.viewer.admin.billingPortalLink.useMutation({
    onSuccess: (data) => {
      if (!data?.url) {
        toastManager.add({ title: t("admin_license_portal_missing_url"), type: "error" });
        return;
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    },
    onError: (error) => {
      toastManager.add({
        title: error.message || t("admin_license_portal_error"),
        type: "error",
      });
    },
  });

  const showResendSection = IS_CALCOM;

  const handleSearch = () => {
    const trimmed = searchEmail.trim();
    if (!trimmed) return;
    setSheetEmail(trimmed);
    setSheetOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {showResendSection && (
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>{t("admin_deployment_search_title")}</CardFrameTitle>
          </CardFrameHeader>
          <Card>
            <CardPanel>
              <Field>
                <FieldLabel>{t("admin_deployment_billing_email")}</FieldLabel>
                <Group className="w-full gap-2">
                  <Input
                    type="email"
                    placeholder={t("admin_license_billing_email_placeholder")}
                    value={searchEmail}
                    onChange={(event) => setSearchEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSearch();
                    }}
                  />
                  <div>
                    <Button type="button" disabled={!searchEmail.trim()} onClick={handleSearch}>
                      {t("search")}
                    </Button>
                  </div>
                </Group>
                <FieldDescription>{t("admin_deployment_search_description")}</FieldDescription>
              </Field>
            </CardPanel>
          </Card>
        </CardFrame>
      )}

      {showResendSection && (
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>{t("admin_license_resend_title")}</CardFrameTitle>
          </CardFrameHeader>
          <Card>
            <CardPanel>
              <Field>
                <FieldLabel>{t("admin_license_billing_email_label")}</FieldLabel>
                <Group className="w-full gap-2">
                  <Input
                    type="email"
                    placeholder={t("admin_license_billing_email_placeholder")}
                    value={billingEmail}
                    onChange={(event) => setBillingEmail(event.target.value)}
                  />
                  <div>
                    <Button
                      type="button"
                      disabled={!billingEmail.trim() || resendEmailMutation.isPending}
                      onClick={() => {
                        resendEmailMutation.mutate({
                          billingEmail: billingEmail.trim(),
                        });
                      }}>
                      {resendEmailMutation.isPending ? "..." : t("admin_license_resend_button")}
                    </Button>
                  </div>
                </Group>
                <FieldDescription>{t("admin_license_resend_description")}</FieldDescription>
              </Field>
            </CardPanel>
          </Card>
        </CardFrame>
      )}

      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>{t("admin_license_portal_title")}</CardFrameTitle>
        </CardFrameHeader>
        <Card>
          <CardPanel>
            <div className="flex items-center justify-between gap-4">
              <CardFrameDescription>{t("admin_license_portal_description")}</CardFrameDescription>
              <Button
                type="button"
                disabled={billingPortalMutation.isPending}
                onClick={() => billingPortalMutation.mutate({})}>
                {t("admin_license_portal_button")}
                <ExternalLinkIcon aria-hidden="true" />
              </Button>
            </div>
          </CardPanel>
        </Card>
      </CardFrame>

      <DeploymentInfoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        email={sheetEmail}
        onEmailChange={(newEmail) => {
          setSheetEmail(newEmail);
          setSearchEmail(newEmail);
        }}
      />
    </div>
  );
}
