"use client";

import Link from "next/link";
import { useEffect, useReducer, type CSSProperties } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { PasswordField } from "@calcom/ui/components/form";

import AuthContainer from "@components/ui/AuthContainer";

import type { getServerSideProps } from "@server/lib/auth/forgot-password/[id]/getServerSideProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

function Success() {
  const { t } = useLocale();
  return (
    <>
      <div className="stack-y-6">
        <div>
          <h2 className="font-cal text-emphasis mt-6 text-center text-3xl font-extrabold">
            {t("password_updated")}
          </h2>
        </div>
        <Button href="/auth/login" className="w-full justify-center">
          {t("login")}
        </Button>
      </div>
    </>
  );
}

function Expired() {
  const { t } = useLocale();
  return (
    <>
      <div className="stack-y-6">
        <div>
          <h2 className="font-cal text-emphasis mt-6 text-center text-3xl font-extrabold">{t("whoops")}</h2>
          <h2 className="text-emphasis text-center text-3xl font-extrabold">{t("request_is_expired")}</h2>
        </div>
        <p>{t("request_is_expired_instructions")}</p>
        <Link
          href="/auth/forgot-password"
          className="flex w-full justify-center px-4 py-2 text-sm font-medium text-blue-600 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2">
          {t("try_again")}
        </Link>
      </div>
    </>
  );
}

type FormValues = {
  newPassword: string;
  csrfToken: string;
};

function PasswordResetForm({
  form: formMethods,
  requestId,
}: {
  form: UseFormReturn<FormValues>;
  requestId: string;
}) {
  const { t } = useLocale();
  const [refreshToken, forceRefresh] = useReducer((x) => x + 1, 0);
  const {
    watch,
    setValue,
    setError,
    formState: { isSubmitting: loading },
  } = formMethods;

  useEffect(() => {
    fetch("/api/csrf", { cache: "no-store" })
      .then((res) => res.json())
      .then(({ csrfToken }) => setValue("csrfToken", csrfToken))
      .catch(() => setValue("csrfToken", ""));
  }, [setValue, refreshToken]);

  const submitChangePassword = async ({
    password,
    requestId,
    csrfToken,
  }: {
    password: string;
    requestId: string;
    csrfToken: string;
  }) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ requestId, password, csrfToken }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const json = await res.json();
    if (!res.ok) {
      // if the request fails, we want to force refresh of the CSRF token - this allows resubmit
      forceRefresh();
      return setError("newPassword", { type: "server", message: json.message });
    }
  };

  const passwordValue = watch("newPassword");
  const isEmpty = passwordValue?.length === 0;

  return (
    <Form
      className="stack-y-6"
      form={formMethods}
      style={
        {
          "--cal-brand": "#111827",
          "--cal-brand-emphasis": "#101010",
          "--cal-brand-text": "white",
          "--cal-brand-subtle": "#9CA3AF",
        } as CSSProperties
      }
      handleSubmit={async (values) => {
        await submitChangePassword({
          password: values.newPassword,
          csrfToken: values.csrfToken,
          requestId,
        });
      }}>
      <input {...formMethods.register("csrfToken")} name="csrfToken" type="hidden" hidden />
      <div className="mt-1">
        <PasswordField
          {...formMethods.register("newPassword", {
            minLength: {
              message: t("password_hint_min"),
              value: 7, // We don't have user here so we can't check if they are admin or not
            },
            pattern: {
              message: "Should contain a number, uppercase and lowercase letters",
              value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).*$/gm,
            },
          })}
          label={t("new_password")}
        />
      </div>

      <div>
        <Button
          loading={loading}
          color="primary"
          type="submit"
          disabled={loading || isEmpty}
          className="w-full justify-center">
          {t("reset_password")}
        </Button>
      </div>
    </Form>
  );
}

export default function Page({ requestId, isRequestExpired }: PageProps) {
  const { t } = useLocale();

  const formMethods = useForm<FormValues>({
    defaultValues: {
      newPassword: "",
      csrfToken: "",
    },
  });

  const {
    formState: { isSubmitSuccessful: success },
  } = formMethods;

  if (isRequestExpired) {
    return (
      <AuthContainer showLogo heading={t("reset_password")}>
        <Expired />
      </AuthContainer>
    );
  }

  return (
    <AuthContainer showLogo heading={!success ? t("reset_password") : undefined}>
      {success ? <Success /> : <PasswordResetForm form={formMethods} requestId={requestId} />}
    </AuthContainer>
  );
}
