import { useRouter } from "next/navigation";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge, Meta, Switch, SkeletonButton, SkeletonContainer, SkeletonText, showToast } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="mb-8 mt-6 space-y-6">
        <div className="flex items-center">
          <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
          <SkeletonText className="h-8 w-full" />
        </div>
      </div>
    </SkeletonContainer>
  );
};

const OrgSecurityView = () => {
  const utils = trpc.useContext();

  const { t } = useLocale();
  const router = useRouter();

  const mutation = trpc.viewer.organizations.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.organizations.listCurrent.invalidate();
      await utils.viewer.me.invalidate();
      showToast(t("your_organisation_updated_sucessfully"), "success");
    },
  });

  const { data: currentOrg, isLoading } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    onError: () => {
      router.push("/settings");
    },
  });

  if (isLoading) return <SkeletonLoader />;

  const twoFactorEnabled =
    currentOrg && currentOrg.metadata ? !!currentOrg.metadata.orgRequireTwoFactorAuth : false;

  return (
    <>
      <Meta title={t("security")} description={t("organization_settings_description")} />
      <div className="mt-6 flex items-start space-x-4">
        <Switch
          data-testid="two-factor-switch"
          checked={twoFactorEnabled}
          onCheckedChange={(orgRequireTwoFactorAuth) => {
            mutation.mutate({ metadata: { orgRequireTwoFactorAuth } });
          }}
        />
        <div className="!mx-4">
          <div className="flex">
            <p className="text-default font-semibold">{t("require_2fa_auth")}</p>
            <Badge className="mx-2 text-xs" variant={twoFactorEnabled ? "success" : "gray"}>
              {twoFactorEnabled ? t("enabled") : t("disabled")}
            </Badge>
          </div>
          <p className="text-default text-sm">{t("organization_enforce_two_factor_authentication")}</p>
        </div>
      </div>
    </>
  );
};

OrgSecurityView.getLayout = getLayout;
OrgSecurityView.PageWrapper = PageWrapper;

export default OrgSecurityView;
