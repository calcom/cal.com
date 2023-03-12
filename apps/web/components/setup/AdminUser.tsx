import { zodResolver } from "@hookform/resolvers/zod";
import classNames from "classnames";
import { signIn } from "next-auth/react";
import React from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import * as z from "zod";

import { isPasswordValid } from "@calcom/features/auth/lib/isPasswordValid";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmailField, EmptyScreen, Label, PasswordField, TextField } from "@calcom/ui";
import { FiUserCheck } from "@calcom/ui/components/icon";

export const AdminUserContainer = (props: React.ComponentProps<typeof AdminUser> & { userCount: number }) => {
  const { t } = useLocale();
  if (props.userCount > 0)
    return (
      <form
        id="wizard-step-1"
        name="wizard-step-1"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          props.onSuccess();
        }}>
        <EmptyScreen
          Icon={FiUserCheck}
          headline={t("admin_user_created")}
          description={t("admin_user_created_description")}
        />
      </form>
    );
  return <AdminUser {...props} />;
};

export const AdminUser = (props: { onSubmit: () => void; onError: () => void; onSuccess: () => void }) => {
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
    props.onError();
  };

  const onSubmit = formMethods.handleSubmit(async (data: z.infer<typeof formSchema>) => {
    props.onSubmit();
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
      await signIn("credentials", {
        redirect: false,
        callbackUrl: "/",
        email: data.email_address.toLowerCase(),
        password: data.password,
      });
      props.onSuccess();
    } else {
      props.onError();
    }
  }, onError);

  const longWebsiteUrl = WEBSITE_URL.length > 30;

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
                      <span className="inline-flex items-center rounded-none px-3 text-sm text-gray-500">
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
