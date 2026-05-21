"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getI18nEditAttributes } from "@calcom/lib/i18nEditMode";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button } from "@calcom/ui/components/button";
import { Form, PasswordField } from "@calcom/ui/components/form";
import AuthContainer from "@components/ui/AuthContainer";
import type { getServerSideProps } from "@server/lib/auth/forgot-password/[id]/getServerSideProps";
import Link from "next/link";
import { type CSSProperties, useEffect, useReducer } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

function Success() {
  const { t, i18n } = useLocale();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const i18nEdit = (key: string) => getI18nEditAttributes(key, locale);
  return (
    <>
      <div className="stack-y-6">
        <div>
          <h2
            {...i18nEdit("password_updated")}
            className="font-cal text-emphasis mt-6 text-center text-3xl font-extrabold">
            {t("password_updated")}
          </h2>
        </div>
        <Button href="/auth/login" className="w-full justify-center">
          <span {...i18nEdit("login")}>{t("login")}</span>
        </Button>
      </div>
    </>
  );
}

function Expired() {
  const { t, i18n } = useLocale();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const i18nEdit = (key: string) => getI18nEditAttributes(key, locale);
  return (
    <>
      <div className="stack-y-6">
        <div>
          <h2
            {...i18nEdit("whoops")}
            className="font-cal text-emphasis mt-6 text-center text-3xl font-extrabold">
            {t("whoops")}
          </h2>
          <h2
            {...i18nEdit("request_is_expired")}
            className="text-emphasis text-center text-3xl font-extrabold">
            {t("request_is_expired")}
          </h2>
        </div>
        <p {...i18nEdit("request_is_expired_instructions")}>{t("request_is_expired_instructions")}</p>
        <Link
          {...i18nEdit("try_again")}
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
  const { t, i18n } = useLocale();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const i18nEdit = (key: string) => getI18nEditAttributes(key, locale);
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
          label={<span {...i18nEdit("new_password")}>{t("new_password")}</span>}
        />
      </div>

      <div>
        <Button
          loading={loading}
          color="primary"
          type="submit"
          disabled={loading || isEmpty}
          className="w-full justify-center">
          <span {...i18nEdit("reset_password")}>{t("reset_password")}</span>
        </Button>
      </div>
    </Form>
  );
}

export default function Page({ requestId, isRequestExpired }: PageProps) {
  const { t, i18n } = useLocale();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const i18nEdit = (key: string) => getI18nEditAttributes(key, locale);

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
      <AuthContainer showLogo heading={<span {...i18nEdit("reset_password")}>{t("reset_password")}</span>}>
        <Expired />
      </AuthContainer>
    );
  }

  return (
    <AuthContainer
      showLogo
      heading={!success ? <span {...i18nEdit("reset_password")}>{t("reset_password")}</span> : undefined}>
      {success ? <Success /> : <PasswordResetForm form={formMethods} requestId={requestId} />}
    </AuthContainer>
  );
}
