import { UserPermissionRole } from "@prisma/client";
import { DeploymentLicenseType } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { useState } from "react";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { WizardForm } from "@calcom/ui";

import AdminUser from "./steps/AdminUser";
import ChooseLicense from "./steps/ChooseLicense";
import EnterpriseLicense from "./steps/EnterpriseLicense";
import StepDone from "./steps/StepDone";

export default function Setup(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const [isLoadingAdminUser, setIsLoadingAdminUser] = useState(false);
  const [isFreeLicense, setIsFreeLicense] = useState(
    props.deployment?.licenseType !== DeploymentLicenseType.EE
  );
  const [isLoadingAdminApps, setIsLoadingAdminApp] = useState(false);
  const [isLoadingChooseLicense, setIsLoadingChooseLicense] = useState(false);
  const [isLoadingEnterpriseLicense, setIsLoadingEnterpriseLicense] = useState(false);
  const [isEnabledEnterpriseLicense, setIsEnabledEnterpriseLicense] = useState(
    !!props.deployment?.licenseKey
  );

  const steps = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      content:
        props.userCount !== 0 ? (
          <StepDone currentStep={1} nextStepPath="/auth/setup?step=2" />
        ) : (
          <AdminUser setIsLoading={setIsLoadingAdminUser} />
        ),
      isLoading: isLoadingAdminUser,
    },
    {
      title: t("choose_a_license"),
      description: t("choose_license_description"),
      content: props.deployment?.licenseType ? (
        <StepDone currentStep={2} nextStepPath="/auth/setup?step=3" />
      ) : (
        <ChooseLicense
          setIsLoading={setIsLoadingChooseLicense}
          isFreeLicense={isFreeLicense}
          setIsFreeLicense={setIsFreeLicense}
        />
      ),
      isLoading: isLoadingChooseLicense,
    },
    ...(!isFreeLicense
      ? [
          {
            title: t("step_enterprise_license"),
            description: t("step_enterprise_license_description"),
            content: props.deployment?.licenseKey ? (
              <StepDone currentStep={3} nextStepPath="/auth/setup?step=4" />
            ) : (
              <EnterpriseLicense
                setIsEnabled={setIsEnabledEnterpriseLicense}
                setIsLoading={setIsLoadingEnterpriseLicense}
              />
            ),
            isLoading: isLoadingEnterpriseLicense,
            isEnabled: isEnabledEnterpriseLicense,
          },
        ]
      : []),
    {
      title: t("enable_apps"),
      description: t("enable_apps_description"),
      content: (
        <AdminAppsList
          fromAdmin
          currentStep={isFreeLicense ? 3 : 4}
          baseURL={`/auth/setup?step=${isFreeLicense ? 3 : 4}`}
          setIsLoading={setIsLoadingAdminApp}
          useQueryParam={true}
        />
      ),
      isLoading: isLoadingAdminApps,
    },
  ];

  return (
    <>
      <main className="flex items-center bg-gray-100 print:h-full">
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const userCount = await prisma.user.count();
  const deployment = await prisma.deployment.findFirst({
    where: { id: 1 },
    select: { licenseType: true, licenseKey: true },
  });
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

  return {
    props: {
      userCount,
      deployment,
    },
  };
};
