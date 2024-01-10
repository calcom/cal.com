"use client";

import Head from "next/head";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout, Button, CheckboxField } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

const MoveTeamPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Head>
        <title>{t("Select the teams")}</title>
        <meta name="description" content={t("to move into your new organization")} />
      </Head>
      <form>
        <ul className="mb-8 space-y-4">
          <li>
            <CheckboxField description="Team #1" />
          </li>
          <li>
            <CheckboxField description="Team #2" />
          </li>
          <li>
            <CheckboxField description="Team #3" />
          </li>
        </ul>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button color="secondary" href="/teams" className="w-full justify-center">
            {t("cancel")}
          </Button>
          <Button color="primary" EndIcon={ArrowRight} type="submit" className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
      </form>
    </>
  );
};
export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={2}>
      {page}
    </WizardLayout>
  );
};

MoveTeamPage.getLayout = LayoutWrapper;
MoveTeamPage.PageWrapper = PageWrapper;

export default MoveTeamPage;
