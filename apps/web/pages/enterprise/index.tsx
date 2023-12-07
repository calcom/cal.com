import { getLayout } from "@calcom/features/MainLayout";
import { ShellMain } from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, ButtonGroup } from "@calcom/ui";
import { BarChart, CreditCard, Globe, Lock, Paintbrush, Users } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

export default function EnterprisePage() {
  const { t } = useLocale();

  const features = [
    {
      icon: <Globe className="h-5 w-5 text-red-500" />,
      title: t("branded_subdomain"),
      description: t("branded_subdomain_description"),
    },
    {
      icon: <BarChart className="h-5 w-5 text-blue-500" />,
      title: t("org_insights"),
      description: t("org_insights_description"),
    },
    {
      icon: <Paintbrush className="h-5 w-5 text-pink-500" />,
      title: t("extensive_whitelabeling"),
      description: t("extensive_whitelabeling_description"),
    },
    {
      icon: <Users className="h-5 w-5 text-orange-500" />,
      title: t("unlimited_teams"),
      description: t("unlimited_teams_description"),
    },
    {
      icon: <CreditCard className="h-5 w-5 text-green-500" />,
      title: t("unified_billing"),
      description: t("unified_billing_description"),
    },
    {
      icon: <Lock className="h-5 w-5 text-purple-500" />,
      title: t("advanced_managed_events"),
      description: t("advanced_managed_events_description"),
    },
  ];
  return (
    <div>
      <ShellMain heading="Enterprise" subtitle={t("enterprise_description")}>
        <UpgradeTip
          plan="enterprise"
          title={t("create_your_org")}
          description={t("create_your_org_description")}
          features={features}
          background="/tips/enterprise"
          buttons={
            <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
              <ButtonGroup>
                <Button color="primary" href="https://i.cal.com/sales/enterprise?duration=25" target="_blank">
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
      </ShellMain>
    </div>
  );
}

EnterprisePage.PageWrapper = PageWrapper;
EnterprisePage.getLayout = getLayout;
