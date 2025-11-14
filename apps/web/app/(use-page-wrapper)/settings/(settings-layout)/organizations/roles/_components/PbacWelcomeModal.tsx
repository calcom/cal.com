"use client";

import { useEffect, useState } from "react";

import { localStorage } from "@calcom/lib/webstorage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";

import { FingerprintAnimation } from "./FingerprintAnimation";

const STORAGE_KEY = "pbac_welcome_modal_dismissed";

interface PbacWelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PbacWelcomeModal({ open, onOpenChange }: PbacWelcomeModalProps) {
  const { t } = useLocale();
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const handleContinue = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    onOpenChange(false);
  };

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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

          <div className="bg-subtle w-full space-y-px overflow-hidden rounded-xl border border-gray-200">
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

          <div className="flex w-full justify-end">
            <Button
              onClick={handleContinue}
              className="w-full justify-center sm:w-auto"
              EndIcon="arrow-right"
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}>
              {t("continue")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function usePbacWelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if modal has been dismissed before
    const hasBeenDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    if (!hasBeenDismissed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    onOpenChange: handleClose,
  };
}

