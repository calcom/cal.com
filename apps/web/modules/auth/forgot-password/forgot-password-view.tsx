"use client";

// eslint-disable-next-line no-restricted-imports
import { debounce } from "lodash";
import Link from "next/link";
import type { CSSProperties, SyntheticEvent } from "react";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { EmailField } from "@calcom/ui/components/form";

import AuthContainer from "@components/ui/AuthContainer";

export type PageProps = {
  csrfToken?: string;
};

export default function ForgotPassword(props: PageProps) {
  const csrfToken = "csrfToken" in props ? (props.csrfToken as string) : undefined;
  const { t } = useLocale();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<{ message: string } | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [email, setEmail] = React.useState("");

  const handleChange = (e: SyntheticEvent) => {
    const target = e.target as typeof e.target & { value: string };
    setEmail(target.value);
  };

  const submitForgotPasswordRequest = async ({ email }: { email: string }) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json);
      } else {
        setSuccess(true);
      }

      return json;
    } catch (reason) {
      setError({ message: t("unexpected_error_try_again") });
    } finally {
      setLoading(false);
    }
  };

  const debouncedHandleSubmitPasswordRequest = debounce(submitForgotPasswordRequest, 250);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    if (!email) {
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    await debouncedHandleSubmitPasswordRequest({ email });
  };

  const Success = () => {
    return (
      <div className="stack-y-6 text-sm leading-normal ">
        <p className="">{t("password_reset_email", { email })}</p>
        <p className="">{t("password_reset_leading")}</p>
        {error && <p className="text-center text-red-600">{error.message}</p>}
        <Button color="secondary" className="w-full justify-center" href="/auth/login">
          {t("back_to_signin")}
        </Button>
      </div>
    );
  };

  return (
    <AuthContainer
      showLogo
      heading={!success ? t("forgot_password") : t("reset_link_sent")}
      footerText={
        !success && (
          <>
            <Link href="/auth/login" className="text-emphasis font-medium">
              {t("back_to_signin")}
            </Link>
          </>
        )
      }>
      {success && <Success />}
      {!success && (
        <>
          <div className="stack-y-6">{error && <p className="text-red-600">{error.message}</p>}</div>
          <form
            className="stack-y-6"
            onSubmit={handleSubmit}
            action="#"
            style={
              {
                "--cal-brand": "#111827",
                "--cal-brand-emphasis": "#101010",
                "--cal-brand-text": "Black",
                "--cal-brand-subtle": "#9CA3AF",
              } as CSSProperties
            }>
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} hidden />
            <EmailField
              onChange={handleChange}
              id="email"
              name="email"
              label={t("email_address")}
              placeholder="john.doe@example.com"
              required
            />
            <div className="stack-y-2">
              <Button
                className="w-full justify-center"
                type="submit"
                color="secondary"
                disabled={loading}
                aria-label={t("request_password_reset")}
                loading={loading}>
                {t("request_password_reset")}
              </Button>
            </div>
          </form>
        </>
      )}
    </AuthContainer>
  );
}
