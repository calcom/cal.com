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
  const [value, setValue] = useState("FREE");

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
            onSuccess={(data) => {
              setValue(data.value);
            }}
          />
        );
      },
    },
  ] as const;

  // steps.push({
  //   title: t("enable_apps"),
  //   description: t("enable_apps_description", { appName: APP_NAME }),
  //   contentClassname: "!pb-0 mb-[-1px]",
  //   content: (setIsPending) => {
  //     const currentStep = isFreeLicense ? 3 : 4;
  //     return (
  //       <AdminAppsList
  //         id={`wizard-step-${currentStep}`}
  //         name={`wizard-step-${currentStep}`}
  //         classNames={{
  //           form: "mb-4 rounded-md bg-default px-0 pt-0 md:max-w-full",
  //           appCategoryNavigationContainer: "max-h-[400px] overflow-y-auto md:p-4",
  //           verticalTabsItem: "!w-48 md:p-4",
  //         }}
  //         baseURL={`/auth/setup?step=${currentStep}`}
  //         useQueryParam={true}
  //         onSubmit={() => {
  //           setIsPending(true);
  //           router.replace("/");
  //         }}
  //       />
  //     );
  //   },
  // });

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

Setup.isThemeSupported = false;
Setup.PageWrapper = PageWrapper;
export default Setup;

export { getServerSideProps };
