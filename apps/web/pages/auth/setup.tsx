import { ExclamationCircleIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { isPasswordValid } from "@calcom/lib/auth";
import classNames from "@calcom/lib/classNames";
import Button from "@calcom/ui/Button";
import WizardForm from "@calcom/ui/WizardForm";
import { Input } from "@calcom/ui/form/fields";
import { Form } from "@calcom/ui/form/fields";

const schema = z.object({
  username: z.string().min(1),
  email: z.string().email({ message: "Please enter a valid email ID" }),
  password: z.string().refine((val) => isPasswordValid(val.trim()), {
    message:
      "The password must be a minimum of 7 characters long containing at least one number and have a mixture of uppercase and lowercase letters",
  }),
});

const SetupFormStep1 = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const formMethods = useForm<{
    username: string;
    email: string;
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
        setLoading(true);
        // complete signup
        const response = await fetch("/api/auth/setup", {
          method: "POST",
          body: JSON.stringify({
            username: data.username,
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
        }
      }}>
      <div>
        <label htmlFor="username" className="sr-only">
          Username
        </label>
        <div className="mt-1 flex rounded-sm">
          <span className="inline-flex items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
            cal.com/
          </span>

          <Input
            onChange={(event) => {
              formMethods.setValue("username", event.target.value);
            }}
            color={formMethods.formState.errors.username ? "warn" : ""}
            type="text"
            name="username"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            placeholder="Username"
            className="rounded-r-s mt-0 block min-w-0 flex-1 rounded-none border-gray-300 px-3 py-2 sm:text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <div
          className={classNames(
            "mt-1 flex rounded-sm shadow-sm",
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
                placeholder="Email address"
                className={classNames(
                  "rounded-r-s block min-w-0 flex-1 rounded-none border-gray-300 px-3 py-2 sm:text-sm",
                  formMethods.formState.errors.email
                    ? "border-r-0 focus:border-l focus:border-gray-300 focus:ring-0"
                    : "focus:border-gray-900 focus:ring-gray-900"
                )}
              />
            )}
          />
        </div>
        {formMethods.formState.errors.email && (
          <p className="mt-1 text-xs text-red-500">{formMethods.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <div
          className={classNames(
            "mt-1 flex rounded-sm shadow-sm",
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
                placeholder="Password"
                className={classNames(
                  "rounded-r-s block min-w-0 flex-1 rounded-none border-gray-300 px-3 py-2 sm:text-sm",
                  formMethods.formState.errors.password
                    ? "border-r-0 focus:border-l focus:border-gray-300 focus:ring-0"
                    : "focus:border-gray-900 focus:ring-gray-900"
                )}
              />
            )}
          />
        </div>
        {formMethods.formState.errors.password && (
          <p className="mt-2 text-xs text-red-500">{formMethods.formState.errors.password.message}</p>
        )}
      </div>

      <input type="submit" id="submit-setup-step-1" className="hidden" />
    </Form>
  );
};

const steps = [
  {
    title: "Administrator user",
    description: "Let's create the first administrator user.",
    content: <SetupFormStep1 />,
  },
];

const Setup: NextPage = () => {
  return (
    <>
      <main className="flex h-screen items-center bg-gray-100 print:h-full">
        <WizardForm href="/setup" steps={steps} />
      </main>
    </>
  );
};

export default Setup;
