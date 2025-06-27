"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { WizardForm } from "@calcom/ui/components/form";

import { AdminUserContainer as AdminUser } from "@components/setup/AdminUser";
import LicenseSelection from "@components/setup/LicenseSelection";

import type { getServerSideProps } from "@server/lib/setup/getServerSideProps";

function useSetStep(defaultStep = 1) {
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const pathname = usePathname();
  const setStep = (newStep = defaultStep) => {
    const _searchParams = new URLSearchParams(searchParams ?? undefined);
    _searchParams.set("step", newStep.toString());
    router.replace(`${pathname}?${_searchParams.toString()}`);
  };
  return setStep;
}

export type PageProps = inferSSRProps<typeof getServerSideProps>;
export function Setup(props: PageProps) {
  let step = 1;
  if (props.userCount > 0) {
    step = 2;
  }
  if (props.hasValidLicense) {
    step = 2;
  } else {
    step = 3;
  }

  const { t } = useLocale();
  const router = useRouter();
  const [licenseOption, setLicenseOption] = useState<"FREE" | "EXISTING">(
    props.hasValidLicense ? "EXISTING" : "EXISTING"
  );
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
            // If there's already a valid license, skip to apps step
            if (props.hasValidLicense) {
              setStep(3);
            } else {
              setStep(2);
            }
          }}
          onError={() => {
            setIsPending(false);
          }}
          userCount={props.userCount}
        />
      ),
    },
  ];

  // Only show license selection step if there's no valid license already
  if (!props.hasValidLicense) {
    steps.push({
      title: t("choose_a_license"),
      description: t("choose_license_description"),
      customActions: true,
      content: (setIsPending, nav) => {
        return (
          <LicenseSelection
            id="wizard-step-2"
            name="wizard-step-2"
            value={licenseOption}
            onChange={setLicenseOption}
            onSubmit={(values) => {
              setIsPending(true);
              if (licenseOption === "FREE") {
                nav.onNext();
              } else if (licenseOption === "EXISTING" && values.licenseKey) {
                nav.onNext();
              }
            }}
            onPrevStep={nav.onPrev}
          />
        );
      },
    });
  }

  steps.push({
    title: t("enable_apps"),
    description: t("enable_apps_description", { appName: APP_NAME }),
    contentClassname: "!pb-0 mb-[-1px]",
    content: (setIsPending) => {
      // Calculate the correct step number based on whether license steps are skipped
      const currentStep = props.hasValidLicense ? 2 : 3;

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
    <main className="bg-subtle flex items-center print:h-full md:h-screen">
      <WizardForm
        href="/auth/setup"
        steps={steps}
        nextLabel={t("next_step_text")}
        finishLabel={t("finish")}
        prevLabel={t("prev_step")}
        stepLabel={(currentStep, maxSteps) => t("current_step_of_total", { currentStep, maxSteps })}
        currentStep={step}
      />
    </main>
  );
}

Setup.isThemeSupported = false;

export default Setup;
