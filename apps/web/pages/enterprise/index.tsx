import { getLayout } from "@calcom/features/MainLayout";
import { ShellMain } from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, ButtonGroup } from "@calcom/ui";
import { BarChart, CreditCard, Globe, Lock, Paintbrush, Users } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

export default function EnterprisePage() {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

  const features = [
    {
      icon: <Globe className="h-5 w-5 text-red-500" />,
      title: t("Branded Subdomain"),
      description: t("Get your own branded subdomain, such as acme.cal.com"),
    },
    {
      icon: <BarChart className="h-5 w-5 text-blue-500" />,
      title: t("Organization-wide Insights"),
      description: t("Understand how your entire organization is spending time"),
    },
    {
      icon: <Paintbrush className="h-5 w-5 text-pink-500" />,
      title: t("Extensive Whitelabeling"),
      description: t("Customize your scheduling experience with your own logo, colors, and more"),
    },
    {
      icon: <Users className="h-5 w-5 text-orange-500" />,
      title: t("Unlimited Teams"),
      description: t("Add as many subteams as you need to your organization"),
    },
    {
      icon: <CreditCard className="h-5 w-5 text-green-500" />,
      title: t("Unified Billing"),
      description: t("Add a single credit card to pay for all your team's subscriptions"),
    },
    {
      icon: <Lock className="h-5 w-5 text-purple-500" />,
      title: t("Advanced Managed Event Types"),
      description: t("Add a single credit card to pay for all your team's subscriptions"),
    },
  ];
  return (
    <div>
      <ShellMain heading="Enterprise" subtitle={t("Upgrade to Enterprise to create your Organization")}>
        <UpgradeTip
          plan="enterprise"
          title={t("Create your Organization")}
          description={t(
            "Upgrade to Enterprise and receive a subdomain, unified billing, Insights, extensive whitelabeling and more"
          )}
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
