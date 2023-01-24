import { UserPermissionRole } from "@prisma/client";
import { DeploymentLicenseType } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { Dispatch, SetStateAction, useState } from "react";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Meta, WizardForm } from "@calcom/ui";

import AdminUser from "./steps/AdminUser";
import ChooseLicense from "./steps/ChooseLicense";
import EnterpriseLicense from "./steps/EnterpriseLicense";
import StepDone from "./steps/StepDone";

export default function Setup(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const [isFreeLicense, setIsFreeLicense] = useState(
    props.deployment?.licenseType !== DeploymentLicenseType.EE
  );
  const [isEnabledEE, setIsEnabledEE] = useState(!!props.deployment?.licenseKey);

  const steps = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      contentEl: (setIsLoading: Dispatch<SetStateAction<boolean>>) =>
        props.userCount !== 0 ? (
          <StepDone currentStep={1} nextStepPath="/auth/setup?step=2" setIsLoading={setIsLoading} />
        ) : (
          <AdminUser setIsLoading={setIsLoading} />
        ),
    },
    {
      title: t("choose_a_license"),
      description: t("choose_license_description"),
      contentEl: (setIsLoading: Dispatch<SetStateAction<boolean>>) =>
        props.deployment?.licenseType ? (
          <StepDone currentStep={2} nextStepPath="/auth/setup?step=3" setIsLoading={setIsLoading} />
        ) : (
          <ChooseLicense
            isFreeLicense={isFreeLicense}
            setIsFreeLicense={setIsFreeLicense}
            setIsLoading={setIsLoading}
          />
        ),
    },
    ...(!isFreeLicense
      ? [
          {
            title: t("step_enterprise_license"),
            description: t("step_enterprise_license_description"),
            contentEl: (setIsLoading: Dispatch<SetStateAction<boolean>>) =>
              props.deployment?.licenseKey ? (
                <StepDone currentStep={3} nextStepPath="/auth/setup?step=4" setIsLoading={setIsLoading} />
              ) : (
                <EnterpriseLicense setIsEnabled={setIsEnabledEE} setIsLoading={setIsLoading} />
              ),
            isEnabled: isEnabledEE,
          },
        ]
      : []),
    {
      title: t("enable_apps"),
      description: t("enable_apps_description"),
      contentClassname: "!pb-0 mb-[-1px]",
      contentEl: (setIsLoading: Dispatch<SetStateAction<boolean>>) => (
        <AdminAppsList
          fromAdmin
          currentStep={isFreeLicense ? 3 : 4}
          baseURL={`/auth/setup?step=${isFreeLicense ? 3 : 4}`}
          setIsLoading={setIsLoading}
          useQueryParam={true}
        />
      ),
    },
  ];

  return (
    <>
      <Meta title={t("setup")} description={t("setup_description")} />
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
