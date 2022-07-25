import { CheckIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { isPasswordValid } from "@calcom/lib/auth";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import WizardForm from "@calcom/ui/WizardForm";
import { Input } from "@calcom/ui/form/fields";
import { Form } from "@calcom/ui/form/fields";

import prisma from "@lib/prisma";

const schema = z.object({
  username: z.string().min(1),
  email: z.string().email({ message: "Please enter a valid email" }),
  fullname: z.string(),
  password: z.string().refine((val) => isPasswordValid(val.trim()), {
    message:
      "The password must be a minimum of 7 characters long containing at least one number and have a mixture of uppercase and lowercase letters",
  }),
});

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

const SetupFormStep1 = () => {
  const router = useRouter();
  const { t } = useLocale();

  const formMethods = useForm<{
    username: string;
    email: string;
    fullname: string;
    password: string;
  }>({
    resolver: zodResolver(schema),
  });

  return (
    <Form
      form={formMethods}
      id="setup-step-1"
      name="setup-step-1"
      className="space-y-4"
      handleSubmit={async (data) => {
        const response = await fetch("/api/auth/setup", {
          method: "POST",
          body: JSON.stringify({
            username: data.username,
            fullname: data.fullname,
            email: data.email.toLowerCase(),
            password: data.password,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.status === 201) {
          router.replace("/auth/login");
        } else {
          router.replace(`/auth/setup`);
        }
      }}>
      <div>
        <label htmlFor="username" className="sr-only">
          {t("username")}
        </label>
        <div
          className={classNames(
            "mt-1 flex rounded-sm",
            formMethods.formState.errors.username ? "border-2 border-red-500" : ""
          )}>
          <span className="inline-flex items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
            cal.com/
          </span>

          <Controller
            name="username"
            control={formMethods.control}
            defaultValue={router.query.username as string}
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                value={value || ""}
                onBlur={onBlur}
                onChange={async (e) => {
                  onChange(e.target.value);
                  formMethods.setValue("username", e.target.value);
                  await formMethods.trigger("username");
                }}
                defaultValue={router.query.email}
                color={formMethods.formState.errors.username ? "warn" : ""}
                type="text"
                name="username"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                placeholder={t("username")}
                className="rounded-r-s mt-0 block min-w-0 flex-1 rounded-none border-gray-300 px-3 py-2 sm:text-sm"
              />
            )}
          />
        </div>
        {formMethods.formState.errors.username && (
          <p role="alert" className="mt-1 text-xs text-red-500">
            {formMethods.formState.errors.username.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="fullname" className="sr-only">
          {t("full_name")}
        </label>
        <div
          className={classNames(
            "flex rounded-sm",
            formMethods.formState.errors.fullname ? "border-2 border-red-500" : "border-0"
          )}>
          <Controller
            name="fullname"
            control={formMethods.control}
            defaultValue={router.query.fullname as string}
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                value={value || ""}
                onBlur={onBlur}
                onChange={async (e) => {
                  onChange(e.target.value);
                  formMethods.setValue("fullname", e.target.value);
                  await formMethods.trigger("fullname");
                }}
                defaultValue={router.query.fullname}
                color={formMethods.formState.errors.fullname ? "warn" : ""}
                type="text"
                name="fullname"
                autoCapitalize="none"
                autoComplete="name"
                autoCorrect="off"
                placeholder={t("full_name")}
                className={classNames(
                  "rounded-r-s mt-0 block min-w-0 flex-1 rounded-none border-gray-300 px-3 py-2 sm:text-sm",
                  formMethods.formState.errors.fullname
                    ? "border-r-0 focus:border-l focus:border-gray-300 focus:ring-0"
                    : "focus:border-gray-900 focus:ring-gray-900"
                )}
              />
            )}
          />
        </div>
        {formMethods.formState.errors.fullname && (
          <p role="alert" className="mt-1 text-xs text-red-500">
            {formMethods.formState.errors.fullname.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="email" className="sr-only">
          {t("email_address")}
        </label>
        <div
          className={classNames(
            "flex rounded-sm",
            formMethods.formState.errors.email ? "border-2 border-red-500" : "border-0"
          )}>
          <Controller
            name="email"
            control={formMethods.control}
            defaultValue={router.query.email as string}
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                value={value || ""}
                onBlur={onBlur}
                onChange={async (e) => {
                  onChange(e.target.value);
                  formMethods.setValue("email", e.target.value);
                  await formMethods.trigger("email");
                }}
                defaultValue={router.query.email}
                color={formMethods.formState.errors.email ? "warn" : ""}
                type="email"
                name="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                placeholder={t("email_address")}
                className={classNames(
                  "rounded-r-s mt-0 block min-w-0 flex-1 rounded-none border-gray-300 px-3 py-2 sm:text-sm",
                  formMethods.formState.errors.email
                    ? "border-r-0 focus:border-l focus:border-gray-300 focus:ring-0"
                    : "focus:border-gray-900 focus:ring-gray-900"
                )}
              />
            )}
          />
        </div>
        {formMethods.formState.errors.email && (
          <p role="alert" className="mt-1 text-xs text-red-500">
            {formMethods.formState.errors.email.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="sr-only">
          {t("password")}
        </label>
        <div
          className={classNames(
            "flex rounded-sm",
            formMethods.formState.errors.password ? "border-2 border-red-500" : "border-0"
          )}>
          <Controller
            name="password"
            control={formMethods.control}
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                value={value || ""}
                onBlur={onBlur}
                onChange={async (e) => {
                  onChange(e.target.value);
                  formMethods.setValue("password", e.target.value);
                  await formMethods.trigger("password");
                }}
                color={formMethods.formState.errors.password ? "warn" : ""}
                type="password"
                name="password"
                autoComplete="off"
                placeholder={t("password")}
                className={classNames(
                  "rounded-r-s mt-0 block min-w-0 flex-1 rounded-none border-gray-300 px-3 py-2 sm:text-sm",
                  formMethods.formState.errors.password
                    ? "border-r-0 focus:border-l focus:border-gray-300 focus:ring-0"
                    : "focus:border-gray-900 focus:ring-gray-900"
                )}
              />
            )}
          />
        </div>
        {formMethods.formState.errors.password && (
          <p role="alert" className="mt-1 max-w-xs text-xs text-red-500">
            {formMethods.formState.errors.password.message}
          </p>
        )}
      </div>

      <input type="submit" id="submit-setup-step-1" className="hidden" />
    </Form>
  );
};

export default function Setup(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();

  const steps = [
    {
      title: t("administrator_user"),
      description: t("lets_create_first_administrator_user"),
      content: props.userCount !== 0 ? <StepDone /> : <SetupFormStep1 />,
      enabled: props.userCount === 0, // to check if the wizard should show buttons to navigate through more steps
    },
  ];

  return (
    <>
      <main className="flex h-screen items-center bg-gray-100 print:h-full">
        <WizardForm href="/setup" steps={steps} />
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
