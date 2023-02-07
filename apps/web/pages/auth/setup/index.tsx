import { UserPermissionRole } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { Dispatch, SetStateAction, useState } from "react";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { getDeploymentKey } from "@calcom/features/ee/deployment/lib/getDeploymentKey";
import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Meta, WizardForm } from "@calcom/ui";

import AdminUser from "@components/setup/AdminUser";
import ChooseLicense from "@components/setup/ChooseLicense";
import EnterpriseLicense from "@components/setup/EnterpriseLicense";

export default function Setup(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(props.isFreeLicense ? "FREE" : "EE");
  const isFreeLicense = value === "FREE";
  const [isEnabledEE, setIsEnabledEE] = useState(!props.isFreeLicense);

  const steps = [
    ...(props.userCount === 0
      ? [
          {
            title: t("administrator_user"),
            description: t("lets_create_first_administrator_user"),
            loadingContent: (setIsLoading: Dispatch<SetStateAction<boolean>>) => (
              <AdminUser setIsLoading={setIsLoading} />
            ),
          },
        ]
      : []),
    {
      title: t("choose_a_license"),
      description: t("choose_license_description"),
      loadingContent: (setIsLoading: Dispatch<SetStateAction<boolean>>) => {
        const currentStep = props.userCount !== 0 ? 1 : 2;
        return (
          <ChooseLicense
            id={`wizard-step-${currentStep}`}
            name={`wizard-step-${currentStep}`}
            value={value}
            onChange={setValue}
            onSubmit={() => {
              setIsLoading(true);
              router.replace(
                `/auth/setup?step=${currentStep + 1}${isFreeLicense ? "&category=calendar" : ""}`
              );
            }}
          />
        );
      },
    },
    ...(!isFreeLicense
      ? [
          {
            title: t("step_enterprise_license"),
            description: t("step_enterprise_license_description"),
            loadingContent: (setIsLoading: Dispatch<SetStateAction<boolean>>) => {
              const currentStep = props.userCount !== 0 ? 2 : 3;
              return (
                <EnterpriseLicense
                  id={`wizard-step-${currentStep}`}
                  name={`wizard-step-${currentStep}`}
                  onSubmit={() => {
                    setIsLoading(true);
                  }}
                  onSuccess={() => {
                    router.replace(`/auth/setup?step=${currentStep + 1}`);
                  }}
                  onSuccessValidate={() => {
                    setIsEnabledEE(true);
                  }}
                />
              );
            },
            isEnabled: isEnabledEE,
          },
        ]
      : []),
    {
      title: t("enable_apps"),
      description: t("enable_apps_description"),
      contentClassname: "!pb-0 mb-[-1px]",
      loadingContent: (setIsLoading: Dispatch<SetStateAction<boolean>>) => (
        <AdminAppsList
          classNames={{
            appCategoryNavigationContainer: " max-h-[400px] overflow-y-auto",
            verticalTabsItem: "!w-48",
          }}
          fromAdmin
          /*
            | userCount === 0 | isFreeLicense | maxSteps |
            |-----------------|---------------|----------|
            | T               | T             |        3 |
            | T               | F             |        4 |
            | F               | T             |        2 |
            | F               | F             |        3 |
          */
          currentStep={(props.userCount === 0) === isFreeLicense ? 3 : !isFreeLicense ? 4 : 2}
          baseURL={`/auth/setup?step=${
            (props.userCount === 0) === isFreeLicense ? 3 : !isFreeLicense ? 4 : 2
          }`}
          setIsLoading={setIsLoading}
          useQueryParam={true}
        />
      ),
    },
  ];

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
        />
      </main>
    </>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
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
      isFreeLicense,
      userCount,
    },
  };
};
