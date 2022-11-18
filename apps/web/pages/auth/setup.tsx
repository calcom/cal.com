import { CheckIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import classNames from "classnames";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import * as z from "zod";

import { isPasswordValid } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { TextField, EmailField, PasswordField, Label } from "@calcom/ui/components/form";
import WizardForm from "@calcom/ui/v2/core/WizardForm";

import { ssrInit } from "@server/lib/ssr";

const StepDone = () => {
  const { t } = useLocale();

  return (
    <div className="min-h-36 my-6 flex flex-col items-center justify-center">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-600 dark:bg-white">
        <CheckIcon className="inline-block h-10 w-10 text-white dark:bg-white dark:text-gray-600" />
      </div>
      <div className="max-w-[420px] text-center">
        <h2 className="mt-6 mb-1 text-lg font-medium dark:text-gray-300">{t("all_done")}</h2>
      </div>
    </div>
  );
};

const SetupFormStep1 = (props: { setIsLoading: (val: boolean) => void }) => {
  const router = useRouter();
  const { t } = useLocale();

  const formSchema = z.object({
    username: z
      .string()
      .refine((val) => val.trim().length >= 1, { message: t("at_least_characters", { count: 1 }) }),
    email_address: z.string().email({ message: t("enter_valid_email") }),
    full_name: z.string().min(3, t("at_least_characters", { count: 3 })),
    password: z.string().superRefine((data, ctx) => {
      const isStrict = true;
      const result = isPasswordValid(data, true, isStrict);
      Object.keys(result).map((key: string) => {
        if (!result[key as keyof typeof result]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: key,
          });
        }
      });
    }),
  });

  const formMethods = useForm<{
    username: string;
    email_address: string;
    full_name: string;
    password: string;
  }>({
    resolver: zodResolver(formSchema),
  });

  const onError = () => {
    props.setIsLoading(false);
  };

  const onSubmit = formMethods.handleSubmit(async (data: z.infer<typeof formSchema>) => {
    props.setIsLoading(true);
    const response = await fetch("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({
        username: data.username.trim(),
        full_name: data.full_name,
        email_address: data.email_address.toLowerCase(),
        password: data.password,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status === 200) {
      router.replace(`/auth/login?email=${data.email_address.toLowerCase()}`);
    } else {
      router.replace("/auth/setup");
    }
  }, onError);

  const longWebsiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL.length > 30;

  return (
    <FormProvider {...formMethods}>
      <form id="wizard-step-1" name="wizard-step-1" className="space-y-4" onSubmit={onSubmit}>
        <div>
          <Controller
            name="username"
            control={formMethods.control}
            render={({ field: { onBlur, onChange, value } }) => (
              <>
                <Label htmlFor="username" className={classNames(longWebsiteUrl && "mb-0")}>
                  <span className="block">{t("username")}</span>
                  {longWebsiteUrl && (
                    <small className="items-centerpx-3 mt-2 inline-flex rounded-t-md border border-b-0 border-gray-300 bg-gray-100 py-1 px-3 text-gray-500">
                      {process.env.NEXT_PUBLIC_WEBSITE_URL}
                    </small>
                  )}
                </Label>
                <TextField
                  addOnLeading={
                    !longWebsiteUrl && (
                      <span className="items-centerpx-3 inline-flex rounded-none text-sm text-gray-500">
                        {process.env.NEXT_PUBLIC_WEBSITE_URL}/
                      </span>
                    )
                  }
                  id="username"
                  labelSrOnly={true}
                  value={value || ""}
                  className={classNames("my-0", longWebsiteUrl && "rounded-t-none")}
                  onBlur={onBlur}
                  name="username"
                  onChange={async (e) => {
                    onChange(e.target.value);
                    formMethods.setValue("username", e.target.value);
                    await formMethods.trigger("username");
                  }}
                />
              </>
            )}
          />
        </div>
        <div>
          <Controller
            name="full_name"
            control={formMethods.control}
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                value={value || ""}
                onBlur={onBlur}
                onChange={async (e) => {
                  onChange(e.target.value);
                  formMethods.setValue("full_name", e.target.value);
                  await formMethods.trigger("full_name");
                }}
                color={formMethods.formState.errors.full_name ? "warn" : ""}
                type="text"
                name="full_name"
                autoCapitalize="none"
                autoComplete="name"
                autoCorrect="off"
                className="my-0"
              />
            )}
          />
        </div>
        <div>
          <Controller
            name="email_address"
            control={formMethods.control}
            render={({ field: { onBlur, onChange, value } }) => (
              <EmailField
                value={value || ""}
                onBlur={onBlur}
                onChange={async (e) => {
                  onChange(e.target.value);
                  formMethods.setValue("email_address", e.target.value);
                  await formMethods.trigger("email_address");
                }}
                className="my-0"
                name="email_address"
              />
            )}
          />
        </div>
        <div>
          <Controller
            name="password"
            control={formMethods.control}
            render={({ field: { onBlur, onChange, value } }) => (
              <PasswordField
                value={value || ""}
                onBlur={onBlur}
                onChange={async (e) => {
                  onChange(e.target.value);
                  formMethods.setValue("password", e.target.value);
                  await formMethods.trigger("password");
                }}
                hintErrors={["caplow", "admin_min", "num"]}
                name="password"
                className="my-0"
                autoComplete="off"
              />
            )}
          />
        </div>
      </form>
    </FormProvider>
  );
};

export default function Setup(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const [isLoadingStep1, setIsLoadingStep1] = useState(false);

  const steps = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      content: props.userCount !== 0 ? <StepDone /> : <SetupFormStep1 setIsLoading={setIsLoadingStep1} />,
      enabled: props.userCount === 0, // to check if the wizard should show buttons to navigate through more steps
      isLoading: isLoadingStep1,
    },
  ];

  return (
    <>
      <main className="flex h-screen items-center bg-gray-100 print:h-full">
        <WizardForm href="/auth/setup" steps={steps} containerClassname="max-w-sm" />
      </main>
    </>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const userCount = await prisma.user.count();

  return {
    props: {
      trpcState: ssr.dehydrate(),
      userCount,
    },
  };
};
