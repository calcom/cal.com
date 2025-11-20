"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import { FingerprintAnimation } from "./FingerprintAnimation";

interface PbacOptInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revalidateRolesPath: () => Promise<void>;
}

export function PbacOptInModal({ open, onOpenChange, revalidateRolesPath }: PbacOptInModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const enablePbacMutation = trpc.viewer.pbac.enablePbac.useMutation({
    onSuccess: async () => {
      showToast(t("pbac_enabled_success"), "success");
      await revalidateRolesPath();
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      showToast(error.message || t("pbac_enabled_error"), "error");
    },
  });

  const handleOptIn = () => {
    enablePbacMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        enableOverflow
        type={undefined}
        className="max-w-[468px] p-6"
        preventCloseOnOutsideClick={true}>
        <div className="flex flex-col items-center gap-8">
          <div className="flex w-full flex-col items-center gap-6">
            <FingerprintAnimation isHovered={isButtonHovered} />

            <div className="flex w-full flex-col items-center gap-1 text-center">
              <h2 className="font-cal text-emphasis text-xl font-semibold">{t("pbac_opt_in_title")}</h2>
              <p className="text-default text-sm">{t("pbac_opt_in_description")}</p>
            </div>
          </div>

          <div className="bg-subtle border-subtle w-full stack-y-px overflow-hidden rounded-xl border">
            <div className="bg-default flex gap-3 p-3">
              <div className="bg-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                <Icon name="shield-check" className="text-subtle h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-emphasis text-sm font-semibold">{t("pbac_opt_in_custom_roles_title")}</p>
                <p className="text-subtle text-sm">{t("pbac_opt_in_custom_roles_desc")}</p>
              </div>
            </div>

            <div className="bg-default flex gap-3 p-3">
              <div className="bg-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                <Icon name="lock" className="text-subtle h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-emphasis text-sm font-semibold">
                  {t("pbac_opt_in_granular_permissions_title")}
                </p>
                <p className="text-subtle text-sm">{t("pbac_opt_in_granular_permissions_desc")}</p>
              </div>
            </div>

            <div className="bg-default flex gap-3 p-3">
              <div className="bg-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                <Icon name="users" className="text-subtle h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-emphasis text-sm font-semibold">
                  {t("pbac_opt_in_team_assignment_title")}
                </p>
                <p className="text-subtle text-sm">{t("pbac_opt_in_team_assignment_desc")}</p>
              </div>
            </div>

            <div className="bg-default flex gap-3 p-3">
              <div className="bg-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                <Icon name="shield" className="text-subtle h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-emphasis text-sm font-semibold">
                  {t("pbac_opt_in_enhanced_security_title")}
                </p>
                <p className="text-subtle text-sm">{t("pbac_opt_in_enhanced_security_desc")}</p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row">
            <Button
              color="secondary"
              onClick={() => onOpenChange(false)}
              disabled={enablePbacMutation.isPending}
              className="w-full justify-center sm:w-1/4">
              {t("cancel")}
            </Button>
            <Button
              onClick={handleOptIn}
              loading={enablePbacMutation.isPending}
              className="w-full justify-center sm:w-3/4"
              EndIcon="arrow-right"
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}>
              {t("pbac_opt_in_enable_button")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
