"use client";

import Shell from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, ButtonGroup } from "@calcom/ui";
import { Icon } from "@calcom/ui";

import type { getServerSideProps } from "@lib/insights/getServerSideProps";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

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
    <div>
      <Shell
        withoutMain={false}
        heading={t("insights")}
        subtitle={t("insights_subtitle")}
        title={t("insights")}
        description={t("insights_subtitle")}>
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
          {!user ? null : children}
        </UpgradeTip>
      </Shell>
    </div>
  );
}
