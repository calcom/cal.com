"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Meta, WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { AdminUserContainer as AdminUser } from "@components/setup/AdminUser";
import ChooseLicense from "@components/setup/ChooseLicense";

import { getServerSideProps } from "@server/lib/setup/getServerSideProps";

export function Setup(props: inferSSRProps<typeof getServerSideProps>) {
  const [step, setStep] = useState(1);
  const { t } = useLocale();
  const router = useRouter();

  const steps = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      content: () => (
        <AdminUser
          onSuccess={() => {
            setStep(2);
          }}
          userCount={props.userCount}
        />
      ),
    },
    {
      title: t("choose_a_license"),
      description: t("choose_license_description"),
      content: () => {
        return (
          <ChooseLicense
            licenseStatus={props.licenseStatus}
            onSuccess={() => {
              localStorage.setItem("onBoardingRedirect", "/settings/admin/apps");
              router.replace("/getting-started");
            }}
          />
        );
      },
    },
  ] as const;

  const currentStep = steps[step - 1];

  if (!currentStep) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <WizardLayout currentStep={step} maxSteps={steps.length}>
        <Meta title={currentStep.title} description={currentStep.description} />
        {currentStep.content()}
      </WizardLayout>
    </>
  );
}

Setup.PageWrapper = PageWrapper;
export default Setup;

export { getServerSideProps };
