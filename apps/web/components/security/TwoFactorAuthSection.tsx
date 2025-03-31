import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

import DisableTwoFactorModal from "./DisableTwoFactorModal";
import EnableTwoFactorModal from "./EnableTwoFactorModal";

const TwoFactorAuthSection = ({ twoFactorEnabled }: { twoFactorEnabled: boolean }) => {
  const [enabled, setEnabled] = useState(twoFactorEnabled);
  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const { t } = useLocale();

  return (
    <>
      <div className="flex flex-col justify-between pl-2 pt-9 sm:flex-row">
        <div>
          <div className="flex flex-row items-center">
            <h2 className="font-cal text-emphasis text-lg font-medium leading-6">{t("2fa")}</h2>
            <Badge className="ml-2 text-xs" variant={enabled ? "success" : "gray"}>
              {enabled ? t("enabled") : t("disabled")}
            </Badge>
          </div>
          <p className="text-subtle mt-1 text-sm">{t("add_an_extra_layer_of_security")}</p>
        </div>
        <div className="mt-5 sm:mt-0 sm:self-center">
          <Button
            type="submit"
            color="secondary"
            onClick={() => (enabled ? setDisableModalOpen(true) : setEnableModalOpen(true))}>
            {enabled ? t("disable") : t("enable")}
          </Button>
        </div>
      </div>
      {enableModalOpen && (
        <EnableTwoFactorModal
          onEnable={() => {
            setEnabled(true);
            setEnableModalOpen(false);
          }}
          onCancel={() => setEnableModalOpen(false)}
        />
      )}

      {disableModalOpen && (
        <DisableTwoFactorModal
          onDisable={() => {
            setEnabled(false);
            setDisableModalOpen(false);
          }}
          onCancel={() => setDisableModalOpen(false)}
        />
      )}
    </>
  );
};

export default TwoFactorAuthSection;
