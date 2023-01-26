import { UserPermissionRole } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { Dispatch, SetStateAction, useState } from "react";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
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
  const [isFreeLicense, setIsFreeLicense] = useState(props.deployment?.licenseKey === "");
  const [isEnabledEE, setIsEnabledEE] = useState(!!props.deployment?.licenseKey);

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
      loadingContent: (setIsLoading: Dispatch<SetStateAction<boolean>>) => (
        <ChooseLicense
          currentStep={props.userCount !== 0 ? 1 : 2}
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
            loadingContent: (setIsLoading: Dispatch<SetStateAction<boolean>>) => (
              <EnterpriseLicense
                currentStep={props.userCount !== 0 ? 2 : 3}
                setIsEnabled={setIsEnabledEE}
                setIsLoading={setIsLoading}
                licenseKey={props.deployment?.licenseKey ?? undefined}
              />
            ),
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
  let deployment = await prisma.deployment.findFirst({
    where: { id: 1 },
    select: { licenseKey: true },
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

  // Check existant CALCOM_LICENSE_KEY env var and acccount for it
  if (process.env.CALCOM_LICENSE_KEY !== "" && !deployment?.licenseKey) {
    deployment = await prisma.deployment.create({
      data: {
        id: 1,
        licenseKey: process.env.CALCOM_LICENSE_KEY,
        licenseConsentAt: new Date(),
      },
    });
  }

  return {
    props: {
      userCount,
      deployment,
    },
  };
};
