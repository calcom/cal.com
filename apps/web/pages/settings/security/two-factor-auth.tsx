import { useState } from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge, Meta, Switch, SkeletonButton, SkeletonContainer, SkeletonText, Alert } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import DisableTwoFactorModal from "@components/settings/DisableTwoFactorModal";
import EnableTwoFactorModal from "@components/settings/EnableTwoFactorModal";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="mt-6 mb-8 space-y-6">
        <div className="flex items-center">
          <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
          <SkeletonText className="h-8 w-full" />
        </div>
      </div>
    </SkeletonContainer>
  );
};

const TwoFactorAuthView = () => {
  const utils = trpc.useContext();

  const { t } = useLocale();
  const { data: user, isLoading } = trpc.viewer.me.useQuery();

  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);

  if (isLoading) return <SkeletonLoader />;

  const isCalProvider = user?.identityProvider === "CAL";
  return (
    <>
      <Meta title={t("2fa")} description={t("2fa_description")} />
      {!isCalProvider && <Alert severity="neutral" message={t("2fa_disabled")} />}
      <div className="mt-6 flex items-start space-x-4">
        <Switch
          disabled={!isCalProvider}
          checked={user?.twoFactorEnabled}
          onCheckedChange={() =>
            user?.twoFactorEnabled ? setDisableModalOpen(true) : setEnableModalOpen(true)
          }
        />
        <div className="!mx-4">
          <div className="flex">
            <p className="text-default font-semibold">{t("two_factor_auth")}</p>
            <Badge className="mx-2 text-xs" variant={user?.twoFactorEnabled ? "success" : "gray"}>
              {user?.twoFactorEnabled ? t("enabled") : t("disabled")}
            </Badge>
          </div>
          <p className="text-default text-sm">{t("add_an_extra_layer_of_security")}</p>
        </div>
      </div>

      <EnableTwoFactorModal
        open={enableModalOpen}
        onOpenChange={() => setEnableModalOpen(!enableModalOpen)}
        onEnable={() => {
          setEnableModalOpen(false);
          utils.viewer.me.invalidate();
        }}
        onCancel={() => {
          setEnableModalOpen(false);
        }}
      />

      <DisableTwoFactorModal
        open={disableModalOpen}
        onOpenChange={() => setDisableModalOpen(!disableModalOpen)}
        onDisable={() => {
          setDisableModalOpen(false);
          utils.viewer.me.invalidate();
        }}
        onCancel={() => {
          setDisableModalOpen(false);
        }}
      />
    </>
  );
};

TwoFactorAuthView.getLayout = getLayout;
TwoFactorAuthView.PageWrapper = PageWrapper;

export default TwoFactorAuthView;
