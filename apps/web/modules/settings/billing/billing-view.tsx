"use client";

import { usePathname } from "next/navigation";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import classNames from "@calcom/ui/classNames";

interface CtaRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

declare global {
  interface Window {
    Plain?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      init: (config: any) => void;
      open: () => void;
    };
  }
}

export const CtaRow = ({ title, description, className, children }: CtaRowProps) => {
  return (
    <>
      <section className={classNames("text-default flex flex-col sm:flex-row", className)}>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pl-3 sm:pt-0">{children}</div>
      </section>
    </>
  );
};

const BillingView = () => {
  const pathname = usePathname();
  const { t } = useLocale();
  const returnTo = pathname;
  const billingHref = `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}`;

  const onContactSupportClick = async () => {
    if (window.Plain) {
      window.Plain.open();
    }
  };

  return (
    <>
      <div className="border-subtle space-y-6 rounded-b-lg border border-t-0 px-6 py-8 text-sm sm:space-y-8">
        <CtaRow title={t("view_and_manage_billing_details")} description={t("view_and_edit_billing_details")}>
          <Button color="primary" href={billingHref} target="_blank" EndIcon="external-link">
            {t("billing_portal")}
          </Button>
        </CtaRow>

        <hr className="border-subtle" />

        <CtaRow title={t("need_anything_else")} description={t("further_billing_help")}>
          <Button color="secondary" onClick={onContactSupportClick}>
            {t("contact_support")}
          </Button>
        </CtaRow>
      </div>
    </>
  );
};

export default BillingView;
