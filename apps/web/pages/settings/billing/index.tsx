import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { HelpScout, useChat } from "react-live-chat-loader";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Meta } from "@calcom/ui";
import { FiExternalLink } from "@calcom/ui/components/icon";

import { ssrInit } from "@server/lib/ssr";

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
      <hr className="border-gray-200" />
    </>
  );
};

const BillingView = () => {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();
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
        <CtaRow
          title={t("billing_manage_details_title")}
          description={t("billing_manage_details_description")}>
          <Button color="primary" href={billingHref} target="_blank" EndIcon={FiExternalLink}>
            {t("billing_portal")}
          </Button>
        </CtaRow>

        <CtaRow title={t("billing_help_title")} description={t("billing_help_description")}>
          <Button color="secondary" onClick={onContactSupportClick}>
            {t("contact_support")}
          </Button>
        </CtaRow>
        {showChat && <HelpScout color="#292929" icon="message" horizontalPosition="right" zIndex="1" />}
      </div>
    </>
  );
};

BillingView.getLayout = getLayout;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default BillingView;
