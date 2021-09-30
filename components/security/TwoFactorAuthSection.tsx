import { useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";

import Badge from "@components/ui/Badge";
import Button from "@components/ui/Button";

import DisableTwoFactorModal from "./DisableTwoFactorModal";
import EnableTwoFactorModal from "./EnableTwoFactorModal";

const TwoFactorAuthSection = ({
  twoFactorEnabled,
  localeProp,
}: {
  twoFactorEnabled: boolean;
  localeProp: string;
}) => {
  const [enabled, setEnabled] = useState(twoFactorEnabled);
  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const { t, locale } = useLocale({ localeProp });

  return (
    <>
      <div className="flex flex-row items-center">
        <h2 className="font-cal text-lg leading-6 font-medium text-gray-900">{t("2fa")}</h2>
        <Badge className="text-xs ml-2" variant={enabled ? "success" : "gray"}>
          {enabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-gray-500">{t("add_an_extra_layer_of_security")}</p>

      <Button
        className="mt-6"
        type="submit"
        onClick={() => (enabled ? setDisableModalOpen(true) : setEnableModalOpen(true))}>
        {enabled ? "Disable" : "Enable"} {t("2fa")}
      </Button>

      {enableModalOpen && (
        <EnableTwoFactorModal
          localeProp={locale}
          onEnable={() => {
            setEnabled(true);
            setEnableModalOpen(false);
          }}
          onCancel={() => setEnableModalOpen(false)}
        />
      )}

      {disableModalOpen && (
        <DisableTwoFactorModal
          localeProp={locale}
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
