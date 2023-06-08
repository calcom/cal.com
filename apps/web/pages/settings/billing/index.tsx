import { useRouter } from "next/router";

import { useIntercom } from "@calcom/features/ee/support/lib/intercom/useIntercom";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Meta } from "@calcom/ui";
import { ExternalLink } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

interface CtaRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

const CtaRow = ({ title, description, className, children }: CtaRowProps) => {
  return (
    <>
      <section className={classNames("text-default flex flex-col sm:flex-row", className)}>
        <div>
          <h2 className="font-medium">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pt-0 sm:pl-3">{children}</div>
      </section>
      <hr className="border-subtle" />
    </>
  );
};

const BillingView = () => {
  const { t } = useLocale();
  const { open } = useIntercom();
  const router = useRouter();
  const returnTo = router.asPath;
  const billingHref = `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}`;

  const onContactSupportClick = async () => {
    await open();
  };

  return (
    <>
      <Meta title={t("billing")} description={t("manage_billing_description")} />
      <div className="space-y-6 text-sm sm:space-y-8">
        <CtaRow title={t("view_and_manage_billing_details")} description={t("view_and_edit_billing_details")}>
          <Button color="primary" href={billingHref} target="_blank" EndIcon={ExternalLink}>
            {t("billing_portal")}
          </Button>
        </CtaRow>

        <CtaRow title={t("need_anything_else")} description={t("further_billing_help")}>
          <Button color="secondary" onClick={onContactSupportClick}>
            {t("contact_support")}
          </Button>
        </CtaRow>
      </div>
    </>
  );
};

BillingView.getLayout = getLayout;
BillingView.PageWrapper = PageWrapper;

export default BillingView;
