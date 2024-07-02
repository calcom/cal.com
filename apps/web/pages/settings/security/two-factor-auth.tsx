"use client";

import { useState } from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  Meta,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  Alert,
  SettingsToggle,
} from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import DisableTwoFactorModal from "@components/settings/DisableTwoFactorModal";
import EnableTwoFactorModal from "@components/settings/EnableTwoFactorModal";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={true} />
      <div className="mb-8 mt-6 space-y-6">
        <div className="flex items-center">
          <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
          <SkeletonText className="h-8 w-full" />
        </div>
      </div>
    </SkeletonContainer>
  );
};

const TwoFactorAuthView = () => {
  const utils = trpc.useUtils();

  const { t } = useLocale();
  const { data: user, isPending } = trpc.viewer.me.useQuery({ includePasswordAdded: true });

  const [enableModalOpen, setEnableModalOpen] = useState<boolean>(false);
  const [disableModalOpen, setDisableModalOpen] = useState<boolean>(false);

  if (isPending)
    return <SkeletonLoader title={t("2fa")} description={t("set_up_two_factor_authentication")} />;

  const isCalProvider = user?.identityProvider === "CAL";
  const canSetupTwoFactor = !isCalProvider && !user?.twoFactorEnabled && !user?.passwordAdded;
  return (
    <>
      <Meta title={t("2fa")} description={t("set_up_two_factor_authentication")} borderInShellHeader={true} />
      {canSetupTwoFactor && <Alert severity="neutral" message={t("2fa_disabled")} />}
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        data-testid="two-factor-switch"
        title={t("two_factor_auth")}
        description={t("add_an_extra_layer_of_security")}
        checked={user?.twoFactorEnabled ?? false}
        onCheckedChange={() =>
          user?.twoFactorEnabled ? setDisableModalOpen(true) : setEnableModalOpen(true)
        }
        Badge={
          <Badge className="mx-2 text-xs" variant={user?.twoFactorEnabled ? "success" : "gray"}>
            {user?.twoFactorEnabled ? t("enabled") : t("disabled")}
          </Badge>
        }
        switchContainerClassName="rounded-t-none border-t-0"
      />

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
        disablePassword={!isCalProvider}
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
