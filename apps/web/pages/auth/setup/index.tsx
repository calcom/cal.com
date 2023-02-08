import { UserPermissionRole } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { getDeploymentKey } from "@calcom/features/ee/deployment/lib/getDeploymentKey";
import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Meta, WizardForm } from "@calcom/ui";

import { AdminUserContainer as AdminUser } from "@components/setup/AdminUser";
import ChooseLicense from "@components/setup/ChooseLicense";
import EnterpriseLicense from "@components/setup/EnterpriseLicense";

import { ssrInit } from "@server/lib/ssr";

export default function Setup(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(props.isFreeLicense ? "FREE" : "EE");
  const isFreeLicense = value === "FREE";
  const [isEnabledEE, setIsEnabledEE] = useState(!props.isFreeLicense);
  const setStep = (newStep: number) => {
    router.replace(`/auth/setup?step=${newStep || 1}`, undefined, { shallow: true });
  };

  const steps: React.ComponentProps<typeof WizardForm>["steps"] = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      content: (setIsLoading) => (
        <AdminUser
          onSubmit={() => {
            setIsLoading(true);
          }}
          onSuccess={() => {
            setStep(2);
          }}
          onError={() => {
            setIsLoading(false);
          }}
          userCount={props.userCount}
        />
      ),
    },
    {
      title: t("choose_a_license"),
      description: t("choose_license_description"),
      content: (setIsLoading) => {
        return (
          <ChooseLicense
            id="wizard-step-2"
            name="wizard-step-2"
            value={value}
            onChange={setValue}
            onSubmit={() => {
              setIsLoading(true);
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
      content: (setIsLoading) => {
        const currentStep = 3;
        return (
          <EnterpriseLicense
            id={`wizard-step-${currentStep}`}
            name={`wizard-step-${currentStep}`}
            onSubmit={() => {
              setIsLoading(true);
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
    description: t("enable_apps_description"),
    contentClassname: "!pb-0 mb-[-1px]",
    content: (setIsLoading) => {
      const currentStep = isFreeLicense ? 3 : 4;
      return (
        <AdminAppsList
          classNames={{
            form: "mb-4 rounded-md bg-white px-0 pt-0 md:max-w-full",
            appCategoryNavigationContainer: " max-h-[400px] overflow-y-auto md:p-4",
            verticalTabsItem: "!w-48 md:p-4",
          }}
          baseURL={`/auth/setup?step=${currentStep}`}
          useQueryParam={true}
          onSubmit={() => {
            setIsLoading(true);
            router.replace("/");
          }}
        />
      );
    },
  });

  return (
    <>
      <Meta title={t("setup")} description={t("setup_description")} />
      <main className="flex items-center bg-gray-100 print:h-full md:h-screen">
        <WizardForm
          href="/auth/setup"
          steps={steps}
          nextLabel={t("next_step_text")}
          finishLabel={t("finish")}
          prevLabel={t("prev_step")}
          stepLabel={(currentStep, maxSteps) => t("current_step_of_total", { currentStep, maxSteps })}
          containerClassname="md:w-[800px]"
        />
      </main>
    </>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const userCount = await prisma.user.count();
  const { req } = context;
  const session = await getSession({ req });

  if (session?.user.role && session?.user.role !== UserPermissionRole.ADMIN) {
    return {
      redirect: {
        destination: `/404`,
        permanent: false,
      },
    };
  }

  let deploymentKey = await getDeploymentKey(prisma);

  // Check existant CALCOM_LICENSE_KEY env var and acccount for it
  if (!!process.env.CALCOM_LICENSE_KEY && !deploymentKey) {
    await prisma.deployment.upsert({
      where: { id: 1 },
      update: {
        licenseKey: process.env.CALCOM_LICENSE_KEY,
        agreedLicenseAt: new Date(),
      },
      create: {
        licenseKey: process.env.CALCOM_LICENSE_KEY,
        agreedLicenseAt: new Date(),
      },
    });
    deploymentKey = await getDeploymentKey(prisma);
  }

  const isFreeLicense = deploymentKey === "";

  return {
    props: {
      trpcState: ssr.dehydrate(),
      isFreeLicense,
      userCount,
    },
  };
};
