import { CheckIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import classNames from "classnames";
import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import * as z from "zod";

import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { isPasswordValid } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { TextField, EmailField, PasswordField, Label } from "@calcom/ui/components/form";
import WizardForm from "@calcom/ui/v2/core/WizardForm";

import SetupFormStep1 from "./steps/SetupFormStep1";
import StepDone from "./steps/StepDone";

export default function Setup(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const [isLoadingStep1, setIsLoadingStep1] = useState(false);

  const steps = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      content: props.userCount === 0 ? <StepDone /> : <SetupFormStep1 setIsLoading={setIsLoadingStep1} />,
      isLoading: isLoadingStep1,
    },
    {
      // TODO: add translations
      title: "Enable apps",
      description: "Apps",
      content: <AdminAppsList />,
      isLoading: false,
    },
  ];

  return (
    <>
      <main className="flex items-center bg-gray-100 print:h-full">
        <WizardForm href="/auth/setup" steps={steps} disableSteps />
      </main>
    </>
  );
}

export const getServerSideProps = async () => {
  const userCount = await prisma.user.count();
  return {
    props: {
      userCount,
    },
  };
};
