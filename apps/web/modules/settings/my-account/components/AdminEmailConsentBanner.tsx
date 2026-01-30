"use client";

import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

export const AdminEmailConsentBanner = () => {
  const { t } = useLocale();
  const router = useRouter();

  const handleOpenAdminStep = () => {
    router.push("/auth/setup?step=2");
  };

  return (
    <div className="border-subtle bg-subtle relative mb-6 overflow-hidden rounded-lg border p-4">
      <div className="flex items-start gap-4">
        <div className="bg-emphasis flex h-10 w-10 items-center justify-center rounded-full">
          <Icon name="mail" className="text-default h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col">
            <h3 className="text-default text-sm font-semibold">{t("stay_informed")}</h3>
            <p className="text-subtle text-sm">{t("self_hosted_admin_email_description")}</p>
          </div>
          <div className="mt-2">
            <Button color="secondary" EndIcon="external-link" onClick={handleOpenAdminStep}>
              {t("update_preferences")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
