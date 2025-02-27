"use client";

import { useSession } from "next-auth/react";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import Shell from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon, ButtonGroup } from "@calcom/ui";

export default function UpgradeToTeams({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const session = useSession();
  const features = [
    {
      icon: <Icon name="users" className="h-5 w-5" />,
      title: t("view_bookings_across"),
      description: t("view_bookings_across_description"),
    },
    {
      icon: <Icon name="refresh-ccw" className="h-5 w-5" />,
      title: t("identify_booking_trends"),
      description: t("identify_booking_trends_description"),
    },
    {
      icon: <Icon name="user-plus" className="h-5 w-5" />,
      title: t("spot_popular_event_types"),
      description: t("spot_popular_event_types_description"),
    },
  ];

  return (
    <Shell heading={t("insights")} subtitle={t("insights_subtitle")} withoutSeo={true}>
      <UpgradeTip
        plan="team"
        title={t("make_informed_decisions")}
        description={t("make_informed_decisions_description")}
        features={features}
        background="/tips/insights"
        buttons={
          <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
            <ButtonGroup>
              <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                {t("create_team")}
              </Button>
              <Button color="minimal" href="https://go.cal.com/insights" target="_blank">
                {t("learn_more")}
              </Button>
            </ButtonGroup>
          </div>
        }>
        {!session.data?.user ? null : children}
      </UpgradeTip>
    </Shell>
  );
}

export function UpgradeInsights({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const session = useSession();
  const features = [
    {
      icon: <Icon name="users" className="h-5 w-5" />,
      title: t("view_bookings_across"),
      description: t("view_bookings_across_description"),
    },
    {
      icon: <Icon name="refresh-ccw" className="h-5 w-5" />,
      title: t("identify_booking_trends"),
      description: t("identify_booking_trends_description"),
    },
    {
      icon: <Icon name="user-plus" className="h-5 w-5" />,
      title: t("spot_popular_event_types"),
      description: t("spot_popular_event_types_description"),
    },
  ];

  return (
    <UpgradeTip
      plan="team"
      title={t("make_informed_decisions")}
      description={t("make_informed_decisions_description")}
      features={features}
      background="/tips/insights"
      buttons={
        <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
          <ButtonGroup>
            <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
              {t("create_team")}
            </Button>
            <Button color="minimal" href="https://go.cal.com/insights" target="_blank">
              {t("learn_more")}
            </Button>
          </ButtonGroup>
        </div>
      }>
      {!session.data?.user ? null : children}
    </UpgradeTip>
  );
}

export function UpgradeToEnterprise() {
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
    <Shell heading={t("enterprise")} subtitle={t("enterprise_description")} withoutSeo={true}>
      <LicenseRequired>
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
                  <Button color="primary" href="https://cal.com/sales" target="_blank">
                    {t("contact_sales")}
                  </Button>
                  <Button color="minimal" href="https://cal.com/enterprise" target="_blank">
                    {t("learn_more")}
                  </Button>
                </ButtonGroup>
              </div>
            }>
            {/* TODO: Show your Organization */}
          </UpgradeTip>
        </div>
      </LicenseRequired>
    </Shell>
  );
}

export function UpgradeToOrganizations() {
  const { t } = useLocale();

  const features = [
    {
      icon: <Icon name="globe" className="h-5 w-5 text-red-500" />,
      title: t("branded_subdomain"),
      description: t("branded_subdomain_description"),
    },
    {
      icon: <Icon name="chart-bar" className="h-5 w-5 text-blue-500" />,
      title: t("org_insights"),
      description: t("org_insights_description"),
    },
    {
      icon: <Icon name="paintbrush" className="h-5 w-5 text-pink-500" />,
      title: t("extensive_whitelabeling"),
      description: t("extensive_whitelabeling_description"),
    },
    {
      icon: <Icon name="users" className="h-5 w-5 text-orange-500" />,
      title: t("unlimited_teams"),
      description: t("unlimited_teams_description"),
    },
    {
      icon: <Icon name="credit-card" className="h-5 w-5 text-green-500" />,
      title: t("unified_billing"),
      description: t("unified_billing_description"),
    },
    {
      icon: <Icon name="lock" className="h-5 w-5 text-purple-500" />,
      title: t("advanced_managed_events"),
      description: t("advanced_managed_events_description"),
    },
  ];
  return (
    <div>
      <Shell heading={t("organizations")} subtitle={t("organizations_description")} withoutSeo={true}>
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
                  {t("create_your_org")}
                </Button>
                <Button color="minimal" href="https://cal.com/enterprise" target="_blank">
                  {t("learn_more")}
                </Button>
              </ButtonGroup>
            </div>
          }>
          <>Create Org</>
        </UpgradeTip>
      </Shell>
    </div>
  );
}
