import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import Badge from "@calcom/ui/v2/core/Badge";
import Switch from "@calcom/ui/v2/core/Switch";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

import DisableTwoFactorModal from "@components/v2/settings/DisableTwoFactorModal";
import EnableTwoFactorModal from "@components/v2/settings/EnableTwoFactorModal";

const TwoFactorAuthView = () => {
  const { t } = useLocale();
  const { data: user } = trpc.useQuery(["viewer.me"]);

  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);

  return (
    <>
      <div className="mt-6 flex items-start space-x-4">
        <div
          onClick={() => {
            enabled ? setDisableModalOpen(true) : setEnableModalOpen(true);
          }}>
          <Switch defaultChecked={user?.twoFactorEnabled} />
        </div>
        <div>
          <div className="flex">
            <p>{t("two_factor_auth")}</p>
            <Badge className="ml-2 text-xs" variant={enabled ? "success" : "gray"}>
              {enabled ? t("enabled") : t("disabled")}
            </Badge>
          </div>
          <p>Add an extra layer of security to your account.</p>
        </div>
      </div>

      <EnableTwoFactorModal
        open={enableModalOpen}
        onOpenChange={() => setEnableModalOpen(!enableModalOpen)}
        onEnable={() => {
          setEnabled(true);
          setEnableModalOpen(false);
        }}
        onCancel={() => {
          setEnableModalOpen(false);
          setEnabled(false);
        }}
      />

      <DisableTwoFactorModal
        open={disableModalOpen}
        onOpenChange={() => setDisableModalOpen(!disableModalOpen)}
        onDisable={() => {
          setEnabled(false);
          setDisableModalOpen(false);
        }}
        onCancel={() => {
          setDisableModalOpen(false);
          setEnabled(true);
        }}
      />
    </>
  );
};

TwoFactorAuthView.getLayout = getLayout;

export default TwoFactorAuthView;
