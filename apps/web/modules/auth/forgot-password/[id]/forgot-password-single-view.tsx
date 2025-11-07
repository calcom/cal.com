"use client";

import { Button } from "@calid/features/ui/components/button";
import { Form } from "@calid/features/ui/components/form";
import { PasswordField } from "@calid/features/ui/components/input/input";
import { Logo } from "@calid/features/ui/components/logo";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import type { getServerSideProps } from "@server/lib/auth/forgot-password/[id]/getServerSideProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function Page({ requestId, isRequestExpired, csrfToken }: PageProps) {
  const { t } = useLocale();
  const formMethods = useForm<{ new_password: string }>();
  const success = formMethods.formState.isSubmitSuccessful;
  const loading = formMethods.formState.isSubmitting;
  const passwordValue = formMethods.watch("new_password");
  const isEmpty = passwordValue?.length === 0;

  const submitChangePassword = async ({ password, requestId }: { password: string; requestId: string }) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ requestId, password }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const json = await res.json();
    if (!res.ok) return formMethods.setError("new_password", { type: "server", message: json.message });
  };

  const Success = () => {
    return (
      <div className="text-center">
        <h1 className="text-emphasis mb-8 text-2xl font-bold">{t("password_updated")}</h1>
        <Button color="primary" className="w-full justify-center py-3" href="/auth/login">
          {t("login")}
        </Button>
      </div>
    );
  };

  const Expired = () => {
    return (
      <div className="text-center">
        <h1 className="text-emphasis text-3xl font-bold">{t("whoops")}</h1>
        <h2 className="text-emphasis mb-4 text-2xl font-bold">{t("request_is_expired")}</h2>
        <p className="text-subtle mb-8">{t("request_is_expired_instructions")}</p>
        <Button color="primary" className="w-full justify-center py-3" href="/auth/forgot-password">
          {t("try_again")}
        </Button>
      </div>
    );
  };

  return (
    <div className="bg-auth-default flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-default border-default w-full max-w-lg rounded-2xl border p-8 shadow-xl">
        {isRequestExpired ? (
          <Expired />
        ) : success ? (
          <Success />
        ) : (
          <div className="text-center">
            <h1 className="text-emphasis mb-8 text-3xl font-bold">{t("reset_password")}</h1>
            <Form
              className="space-y-6"
              form={formMethods}
              onSubmit={async (values) => {
                await submitChangePassword({
                  password: values.new_password,
                  requestId,
                });
              }}>
              <input name="csrfToken" type="hidden" defaultValue={csrfToken} hidden />
              <div className="text-left">
                <PasswordField
                  variant="floating"
                  showStrengthMeter={true}
                  showStrengthColors={true}
                  showRequirements={true}
                  size="lg"
                  {...formMethods.register("new_password")}
                  // {...formMethods.register("new_password", {
                  //   minLength: {
                  //     message: t("password_hint_min"),
                  //     value: 7, // We don't have user here so we can't check if they are admin or not
                  //   },
                  //   pattern: {
                  //     message: "Should contain a number, uppercase and lowercase letters",
                  //     value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).*$/gm,
                  //   },
                  // })}
                  label={t("new_password")}
                />
              </div>

              <Button
                loading={loading}
                color="primary"
                type="submit"
                disabled={loading || isEmpty || !formMethods.getValues("new_password")}
                className="bg-active border-active dark:border-default w-full justify-center py-3 dark:bg-gray-200">
                {t("reset_password")}
              </Button>
            </Form>
            <div className="mt-4 text-center">
              <Link href="/auth/login" className="text-subtle hover:text-emphasis text-sm">
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
      <div className="mt-8">
        <div className="mb-8 flex justify-center">
          <Logo small icon />
        </div>
      </div>
    </div>
  );
}
