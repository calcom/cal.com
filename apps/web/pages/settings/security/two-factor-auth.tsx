import type { GetServerSidePropsContext } from "next";
import { useState } from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge, Meta, Switch, SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui";

import DisableTwoFactorModal from "@components/settings/DisableTwoFactorModal";
import EnableTwoFactorModal from "@components/settings/EnableTwoFactorModal";

import { ssrInit } from "@server/lib/ssr";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="mt-6 mb-8 space-y-6 divide-y">
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

  return (
    <>
      <Meta title={t("2fa")} description={t("2fa_description")} />
      <div className="mt-6 flex items-start space-x-4">
        <Switch
          checked={user?.twoFactorEnabled}
          onCheckedChange={() =>
            user?.twoFactorEnabled ? setDisableModalOpen(true) : setEnableModalOpen(true)
          }
        />
        <div>
          <div className="flex">
            <p className="font-semibold">{t("two_factor_auth")}</p>
            <Badge className="ml-2 text-xs" variant={user?.twoFactorEnabled ? "success" : "gray"}>
              {user?.twoFactorEnabled ? t("enabled") : t("disabled")}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{t("add_an_extra_layer_of_security")}</p>
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default TwoFactorAuthView;
