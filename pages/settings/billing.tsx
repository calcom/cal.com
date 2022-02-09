import { ExternalLinkIcon } from "@heroicons/react/solid";
import { ReactNode } from "react";
import { useIntercom } from "react-use-intercom";

import { useLocale } from "@lib/hooks/useLocale";

import SettingsShell from "@components/SettingsShell";
import Shell, { useMeQuery } from "@components/Shell";
import Button from "@components/ui/Button";

type CardProps = { title: string; description: string; className?: string; children: ReactNode };
const Card = ({ title, description, className = "", children }: CardProps): JSX.Element => (
  <div className={`border bg-white sm:rounded-sm ${className}`}>
    <div className="px-4 py-5 sm:p-6">
      <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
      <div className="mt-2 max-w-xl text-sm text-gray-500">
        <p>{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  </div>
);

export default function Billing() {
  const { t } = useLocale();
  const query = useMeQuery();
  const { data } = query;
  const { boot, show } = useIntercom();

  return (
    <Shell heading={t("billing")} subtitle={t("manage_your_billing_info")}>
      <SettingsShell>
        <div className="py-6 lg:col-span-9 lg:pb-8">
          {data?.plan && ["FREE", "TRIAL"].includes(data.plan) && (
            <Card
              title={t("plan_description", { plan: data.plan })}
              description={t("plan_upgrade_invitation")}
              className="mb-4">
              <form method="POST" action={`/api/upgrade`}>
                <Button type="submit">
                  {t("upgrade_now")} <ExternalLinkIcon className="ml-1 h-4 w-4" />
                </Button>
              </form>
            </Card>
          )}

          <Card title={t("view_and_manage_billing_details")} description={t("view_and_edit_billing_details")}>
            <form method="POST" action={`/api/integrations/stripepayment/portal`}>
              <Button type="submit" color="secondary">
                {t("go_to_billing_portal")} <ExternalLinkIcon className="ml-1 h-4 w-4" />
              </Button>
            </form>
          </Card>
          <div className="mt-4 border bg-gray-50 sm:rounded-sm">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">{t("need_anything_else")}</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>{t("further_billing_help")}</p>
              </div>
              <div className="mt-5">
                <Button
                  onClick={() => {
                    boot();
                    show();
                  }}
                  color="secondary">
                  {t("contact_our_support_team")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SettingsShell>
    </Shell>
  );
}
