"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";

import BillingCredits from "~/settings/billing/components/BillingCredits";

interface CtaRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

declare global {
  interface Window {
    Support?: {
      open: () => void;
      shouldShowTriggerButton: (showTrigger: boolean) => void;
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
  const session = useSession();
  const { t } = useLocale();
  const returnTo = pathname;

  // Determine the billing context and extract appropriate team/org ID
  const getTeamIdFromContext = () => {
    if (!pathname) return null;

    // Team billing: /settings/teams/{id}/billing
    if (pathname.includes("/teams/") && pathname.includes("/billing")) {
      const teamIdMatch = pathname.match(/\/teams\/(\d+)\/billing/);
      return teamIdMatch ? teamIdMatch[1] : null;
    }

    // Organization billing: /settings/organizations/billing
    if (pathname.includes("/organizations/billing")) {
      const orgId = session.data?.user?.org?.id;
      return typeof orgId === "number" ? orgId.toString() : null;
    }
  };

  const teamId = getTeamIdFromContext();

  const billingHref = teamId
    ? `/api/integrations/stripepayment/portal?teamId=${teamId}&returnTo=${WEBAPP_URL}${returnTo}`
    : `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}`;

  const onContactSupportClick = async () => {
    if (window.Support) {
      window.Support.open();
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
      </div>
      <BillingCredits />
      <div className="border-subtle mt-6 space-y-6 rounded-lg border px-6 py-8 text-sm sm:space-y-8">
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
