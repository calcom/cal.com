import Shell, { MobileNavigationMoreItems } from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, ButtonGroup } from "@calcom/ui";
import { EyeOff, Mail, RefreshCcw, UserPlus, Users, Video } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

export default function CommercialPage() {
  const { t } = useLocale();
  const features = [
    {
      icon: <Users className="h-5 w-5 text-red-500" />,
      title: t("collective_scheduling"),
      description: t("make_it_easy_to_book"),
    },
    {
      icon: <RefreshCcw className="h-5 w-5 text-blue-500" />,
      title: t("round_robin"),
      description: t("find_the_best_person"),
    },
    {
      icon: <UserPlus className="h-5 w-5 text-green-500" />,
      title: t("fixed_round_robin"),
      description: t("add_one_fixed_attendee"),
    },
    {
      icon: <Mail className="h-5 w-5 text-orange-500" />,
      title: t("sms_attendee_action"),
      description: t("send_reminder_sms"),
    },
    {
      icon: <Video className="h-5 w-5 text-purple-500" />,
      title: "Cal Video" + " " + t("recordings_title"),
      description: t("upgrade_to_access_recordings_description"),
    },
    {
      icon: <EyeOff className="h-5 w-5 text-indigo-500" />,
      title: t("disable_cal_branding", { appName: APP_NAME }),
      description: t("disable_cal_branding_description", { appName: APP_NAME }),
    },
  ];
  return (
    <Shell hideHeadingOnMobile>
      <UpgradeTip
        plan="license"
        title={t("Acquire a commercial license")}
        description={t(
          "Purchase a commercial license to unlock enterprise features, such as workflows, routing forms, enhanced admin tools and more!"
        )}
        features={features}
        background="/tips/insights"
        buttons={
          <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
            <ButtonGroup>
              <Button color="primary" href="https://cal.com/sales">
                {t("contact_sales")}
              </Button>
            </ButtonGroup>
          </div>
        }>
        <div className="max-w-screen-lg">
          <MobileNavigationMoreItems />
          <p className="text-subtle mt-6 text-xs leading-tight md:hidden">{t("more_page_footer")}</p>
        </div>
      </UpgradeTip>
    </Shell>
  );
}
CommercialPage.PageWrapper = PageWrapper;
