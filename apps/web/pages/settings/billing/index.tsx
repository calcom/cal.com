import { useRouter } from "next/router";
import { useState } from "react";
import { HelpScout, useChat } from "react-live-chat-loader";

import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button } from "@calcom/ui/components/button";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

interface CtaRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

const CtaRow = ({ title, description, className, children }: CtaRowProps) => {
  return (
    <>
      <section className={classNames("flex flex-col sm:flex-row", className)}>
        <div>
          <h2 className="font-medium">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pt-0 sm:pl-3">{children}</div>
      </section>
      <hr className="border-neutral-200" />
    </>
  );
};

const BillingView = () => {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();
  const isPro = user?.plan === "PRO";
  const [, loadChat] = useChat();
  const [showChat, setShowChat] = useState(false);
  const router = useRouter();
  const returnTo = router.asPath;
  const billingHref = `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}`;

  const onContactSupportClick = () => {
    setShowChat(true);
    loadChat({ open: true });
  };

  return (
    <>
      <Meta title={t("billing")} description={t("manage_billing_description")} />
      <div className="space-y-6 text-sm sm:space-y-8">
        {!isPro && (
          <CtaRow title={t("billing_freeplan_title")} description={t("billing_freeplan_description")}>
            <form target="_blank" method="POST" action="/api/upgrade">
              <Button type="submit" EndIcon={Icon.FiExternalLink}>
                {t("billing_freeplan_cta")}
              </Button>
            </form>
          </CtaRow>
        )}

        <CtaRow
          className={classNames(!isPro && "pointer-events-none opacity-30")}
          title={t("billing_manage_details_title")}
          description={t("billing_manage_details_description")}>
          <Button
            color={isPro ? "primary" : "secondary"}
            href={billingHref}
            target="_blank"
            EndIcon={Icon.FiExternalLink}>
            {t("billing_portal")}
          </Button>
        </CtaRow>

        <CtaRow title={t("billing_help_title")} description={t("billing_help_description")}>
          <Button color="secondary" onClick={onContactSupportClick}>
            {t("billing_help_cta")}
          </Button>
        </CtaRow>
        {showChat && <HelpScout color="#292929" icon="message" horizontalPosition="right" zIndex="1" />}
      </div>
    </>
  );
};

BillingView.getLayout = getLayout;

export default BillingView;
