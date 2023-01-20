import { UserPermissionRole } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { useState } from "react";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { WizardForm } from "@calcom/ui";

import SetupFormStep1 from "./steps/SetupFormStep1";
import StepDone from "./steps/StepDone";

export default function Setup(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const [isLoadingStep1, setIsLoadingStep1] = useState(false);
  const shouldDisable = props.userCount !== 0;

  const steps = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      content: shouldDisable ? <StepDone /> : <SetupFormStep1 setIsLoading={setIsLoadingStep1} />,
      isLoading: isLoadingStep1,
    },
    {
      title: t("enable_apps"),
      description: t("enable_apps_description"),
      content: <AdminAppsList baseURL="/auth/setup?step=2" useQueryParam={true} />,
      isLoading: false,
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
    },
  };
};
