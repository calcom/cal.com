import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Card } from "@calcom/ui/components/card";
import { Icon } from "@calcom/ui/components/icon";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import { helpCards } from "@lib/settings/platform/utils";

export const HelpCards = () => {
  const { t } = useLocale();
  const { userBillingData } = useGetUserAttributes();
  const isPaidUser = userBillingData?.valid && userBillingData?.plan?.toLowerCase() !== "free";

  return (
    <>
      <div className="grid-col-1 mb-4 grid gap-2 md:grid-cols-3">
        {helpCards.map((card) => {
          if (card.title === "Contact us" && !isPaidUser) return null;

          const title = card.title === "Report issue" ? t("report_issue") : card.title;
          const description =
            card.title === "Report issue" ? t("report_issue_description") : card.description;
          const actionButtonChild = card.title === "Report issue" ? t("open_issue") : card.actionButton.child;

          return (
            <div key={card.title}>
              <Card
                icon={<Icon name={card.icon} className="h-5 w-5 text-green-700" />}
                variant={card.variant}
                title={title}
                description={description}
                actionButton={{
                  href: `${card.actionButton.href}`,
                  child: actionButtonChild,
                }}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};
