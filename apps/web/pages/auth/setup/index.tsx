"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Meta, WizardForm } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { AdminUserContainer as AdminUser } from "@components/setup/AdminUser";
import ChooseLicense from "@components/setup/ChooseLicense";
import EnterpriseLicense from "@components/setup/EnterpriseLicense";

import { getServerSideProps } from "@server/lib/setup/getServerSideProps";

function useSetStep() {
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const pathname = usePathname();
  const setStep = (newStep = 1) => {
    const _searchParams = new URLSearchParams(searchParams ?? undefined);
    _searchParams.set("step", newStep.toString());
    router.replace(`${pathname}?${_searchParams.toString()}`);
  };
  return setStep;
}

export function Setup(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(props.isFreeLicense ? "FREE" : "EE");
  const isFreeLicense = value === "FREE";
  const [isEnabledEE, setIsEnabledEE] = useState(!props.isFreeLicense);
  const setStep = useSetStep();

  const steps: React.ComponentProps<typeof WizardForm>["steps"] = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      content: (setIsPending) => (
        <AdminUser
          onSubmit={() => {
            setIsPending(true);
          }}
          onSuccess={() => {
            setStep(2);
          }}
          onError={() => {
            setIsPending(false);
          }}
          userCount={props.userCount}
        />
      ),
    },
    {
      title: t("choose_a_license"),
      description: t("choose_license_description"),
      content: (setIsPending) => {
        return (
          <ChooseLicense
            id="wizard-step-2"
            name="wizard-step-2"
            value={value}
            onChange={setValue}
            onSubmit={() => {
              setIsPending(true);
              setStep(3);
            }}
          />
        );
      },
    },
  ];

  if (!isFreeLicense) {
    steps.push({
      title: t("step_enterprise_license"),
      description: t("step_enterprise_license_description"),
      content: (setIsPending) => {
        const currentStep = 3;
        return (
          <EnterpriseLicense
            id={`wizard-step-${currentStep}`}
            name={`wizard-step-${currentStep}`}
            onSubmit={() => {
              setIsPending(true);
            }}
            onSuccess={() => {
              setStep(currentStep + 1);
            }}
            onSuccessValidate={() => {
              setIsEnabledEE(true);
            }}
          />
        );
      },
      isEnabled: isEnabledEE,
    });
  }

  steps.push({
    title: t("enable_apps"),
    description: t("enable_apps_description", { appName: APP_NAME }),
    contentClassname: "!pb-0 mb-[-1px]",
    content: (setIsPending) => {
      const currentStep = isFreeLicense ? 3 : 4;
      return (
        <AdminAppsList
          id={`wizard-step-${currentStep}`}
          name={`wizard-step-${currentStep}`}
          classNames={{
            form: "mb-4 rounded-md bg-default px-0 pt-0 md:max-w-full",
            appCategoryNavigationContainer: "max-h-[400px] overflow-y-auto md:p-4",
            verticalTabsItem: "!w-48 md:p-4",
          }}
          baseURL={`/auth/setup?step=${currentStep}`}
          useQueryParam={true}
          onSubmit={() => {
            setIsPending(true);
            router.replace("/");
          }}
        />
      );
    },
  });

  return (
    <>
      <Meta title={t("setup")} description={t("setup_description")} />
      <main className="bg-subtle flex items-center print:h-full md:h-screen">
        <WizardForm
          href="/auth/setup"
          steps={steps}
          nextLabel={t("next_step_text")}
          finishLabel={t("finish")}
          prevLabel={t("prev_step")}
          stepLabel={(currentStep, maxSteps) => t("current_step_of_total", { currentStep, maxSteps })}
        />
      </main>
    </>
  );
}

Setup.isThemeSupported = false;
Setup.PageWrapper = PageWrapper;
export default Setup;

export { getServerSideProps };
