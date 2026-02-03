"use client";

import { useSession } from "next-auth/react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { Icon } from "@calcom/ui/components/icon";

import { UpgradeTip } from "~/shell/UpgradeTip";

export default function UpgradeTipWrapper({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const session = useSession();
  const features = [
    {
      icon: <Icon name="users" className="h-5 w-5 text-red-500" />,
      title: t("view_bookings_across"),
      description: t("view_bookings_across_description"),
    },
    {
      icon: <Icon name="refresh-ccw" className="h-5 w-5 text-blue-500" />,
      title: t("identify_booking_trends"),
      description: t("identify_booking_trends_description"),
    },
    {
      icon: <Icon name="user-plus" className="h-5 w-5 text-green-500" />,
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
        <div className="stack-y-2 rtl:space-x-reverse sm:space-x-2">
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
