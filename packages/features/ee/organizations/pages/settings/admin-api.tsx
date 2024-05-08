"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { UpgradeTip } from "@calcom/features/tips";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon, Meta, ButtonGroup } from "@calcom/ui";

const AdminAPIViewWrapper = () => {
  const { t } = useLocale();

  const features = [
    {
      icon: <Icon name="terminal" className="h-5 w-5 text-pink-500" />,
      title: t("admin_api"),
      description: t("leverage_our_api"),
    },
    {
      icon: <Icon name="folder" className="h-5 w-5 text-red-500" />,
      title: `SCIM & ${t("directory_sync")}`,
      description: t("directory_sync_description"),
    },
    {
      icon: <Icon name="sparkles" className="h-5 w-5 text-blue-500" />,
      title: "Cal.ai",
      description: t("use_cal_ai_to_make_call_description"),
    },
  ];
  return (
    <LicenseRequired>
      <Meta
        title={`${t("admin")} ${t("api_reference")}`}
        description={t("leverage_our_api")}
        borderInShellHeader={false}
      />
      <div className="mt-8">
        <UpgradeTip
          plan="enterprise"
          title={t("enterprise_license")}
          description={t("create_your_enterprise_description")}
          features={features}
          background="/tips/enterprise"
          buttons={
            <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
              <ButtonGroup>
                <Button color="primary" href="https://i.cal.com/sales/enterprise" target="_blank">
                  {t("contact_sales")}
                </Button>
                <Button color="minimal" href="https://cal.com/enterprise" target="_blank">
                  {t("learn_more")}
                </Button>
              </ButtonGroup>
            </div>
          }>
          <>Create Org</>
        </UpgradeTip>
      </div>
    </LicenseRequired>
  );
};

AdminAPIViewWrapper.getLayout = getLayout;

export default AdminAPIViewWrapper;
