import { useLocale } from "@calcom/lib/hooks/useLocale";
import { UpgradePlanDialog } from "@calcom/web/modules/billing/components/UpgradePlanDialog";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFooter,
  CardFrame,
  CardFrameAction,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { ExternalLinkIcon } from "@coss/ui/icons";
import Image from "next/image";

const items = [
  {
    titleKey: "upgrade_to_orgs_consolidate_teams_title",
    descriptionKey: "upgrade_to_orgs_consolidate_teams_description",
    image: "/upgrade/teams/consolidate-teams.svg",
    imageOffsetY: { base: "40%", sm: "40%", md: "40%" },
  },
  {
    titleKey: "upgrade_to_orgs_clean_subdomain_title",
    descriptionKey: "upgrade_to_orgs_clean_subdomain_description",
    image: "/upgrade/teams/clean-subdomain.svg",
    imageOffsetY: { base: "-20%", sm: "-5%", md: "-5%" },
  },
  {
    titleKey: "upgrade_to_orgs_consolidate_insights_title",
    descriptionKey: "upgrade_to_orgs_consolidate_insights_description",
    image: "/upgrade/teams/consolidate-insights.svg",
    imageOffsetY: { base: "-20%", sm: "-5%", md: "-5%" },
  },
];

export function UpgradeToOrgsBanner() {
  const { t } = useLocale();

  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle className="mt-1.5">{t("upgrade_cta_orgs")}</CardFrameTitle>
        <CardFrameAction>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              render={
                <a href="https://cal.com/organizations" target="_blank" rel="noopener noreferrer" />
              }>
              <span className="hidden md:inline">{t("learn_more")}</span>
              <ExternalLinkIcon className="h-4 w-4 md:hidden" />
            </Button>
            <UpgradePlanDialog tracking="teams-page-upgrade-to-orgs" target="organization">
              <Button variant="outline">{t("upgrade")}</Button>
            </UpgradePlanDialog>
          </div>
        </CardFrameAction>
      </CardFrameHeader>
      <Card className="overflow-hidden">
        <CardPanel className="-p-6">
          <div className="grid grid-cols-1 md:grid-cols-3">
            {items.map((item) => (
              <div key={item.titleKey} className="border-subtle flex flex-col overflow-hidden border-b last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <div
                  className="relative h-[94px] overflow-hidden"
                  style={
                    {
                      "--offset-base": item.imageOffsetY.base,
                      "--offset-sm": item.imageOffsetY.sm,
                      "--offset-md": item.imageOffsetY.md,
                    } as React.CSSProperties
                  }>
                  <Image
                    src={item.image}
                    alt={t(item.titleKey)}
                    fill
                    className="object-cover object-[center_var(--offset-base)] sm:object-[center_var(--offset-sm)] md:object-[center_var(--offset-md)]"
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-default to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-default to-transparent" />
                </div>
                <div className="flex flex-col gap-2 px-5 pb-5 pt-[26px]">
                  <h3 className="text-base font-semibold">{t(item.titleKey)}</h3>
                  <p className="text-subtle text-sm font-normal">{t(item.descriptionKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
