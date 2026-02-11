"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import AdminAppsList from "~/apps/components/AdminAppsList";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { WizardForm } from "@calcom/ui/components/form";
import type { WizardStep } from "@calcom/ui/components/form/wizard/WizardForm";

import { AdminUserContainer as AdminUser } from "@components/setup/AdminUser";
import LicenseSelection from "@components/setup/LicenseSelection";

import type { getServerSideProps } from "@server/lib/setup/getServerSideProps";

const SETUP_VIEW_SETPS = {
  ADMIN_USER: 1,
  LICENSE: 2,
  APPS: 3,
} as const;

export type PageProps = inferSSRProps<typeof getServerSideProps>;
export function Setup(props: PageProps) {
  const [hasPickedAGPLv3, setHasPickedAGPLv3] = useState(false);
  const { t } = useLocale();
  const router = useRouter();
  const [licenseOption, setLicenseOption] = useState<"FREE" | "EXISTING">(
    props.hasValidLicense ? "EXISTING" : "FREE"
  );

  const defaultStep = useMemo(() => {
    if (props.userCount > 0) {
      if (!props.hasValidLicense && !hasPickedAGPLv3) {
        return SETUP_VIEW_SETPS.LICENSE;
      } else {
        return SETUP_VIEW_SETPS.APPS;
      }
    }
    return SETUP_VIEW_SETPS.ADMIN_USER;
  }, [props.userCount, props.hasValidLicense, hasPickedAGPLv3]);

  const steps: WizardStep[] = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      customActions: true,
      content: (setIsPending, nav) => (
        <AdminUser
          onSubmit={() => {
            setIsPending(true);
          }}
          onSuccess={() => {
            // If there's already a valid license or user picked AGPLv3, skip to apps step
            if (props.hasValidLicense || hasPickedAGPLv3) {
              nav.onNext();
              nav.onNext(); // Skip license step
            } else {
              nav.onNext();
            }
          }}
          onError={() => {
            setIsPending(false);
          }}
          userCount={props.userCount}
          nav={nav}
        />
      ),
    },
  ];

  // Only show license selection step if there's no valid license already and AGPLv3 wasn't picked
  if (!props.hasValidLicense && !hasPickedAGPLv3) {
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
                setHasPickedAGPLv3(true);
                nav.onNext();
              } else if (licenseOption === "EXISTING" && values.licenseKey) {
                nav.onNext();
              }
            }}
            onPrevStep={nav.onPrev}
            onNextStep={nav.onNext}
          />
        );
      },
    });
  }

  steps.push({
    title: t("enable_apps"),
    description: t("enable_apps_description", { appName: APP_NAME }),
    contentClassname: "pb-0! -mb-px",
    customActions: true,
    content: (setIsPending, nav) => {
      return (
        <AdminAppsList
          id={`wizard-step-${steps.length}`}
          name={`wizard-step-${steps.length}`}
          classNames={{
            form: "mb-4 rounded-md bg-default px-0 pt-0 md:max-w-full",
            appCategoryNavigationContainer: "max-h-[400px] overflow-y-auto md:p-4",
            verticalTabsItem: "w-48! md:p-4",
          }}
          baseURL={`/auth/setup?step=${steps.length}`}
          useQueryParam={true}
          onSubmit={() => {
            setIsPending(true);
            router.replace("/");
          }}
          nav={nav}
        />
      );
    },
  });

  return (
    <main className="bg-subtle flex items-center print:h-full md:h-screen">
      <WizardForm
        defaultStep={defaultStep}
        steps={steps}
        nextLabel={t("next_step_text")}
        finishLabel={t("finish")}
        prevLabel={t("prev_step")}
        stepLabel={(currentStep, maxSteps) => t("current_step_of_total", { currentStep, maxSteps })}
      />
    </main>
  );
}

Setup.isThemeSupported = false;

export default Setup;
