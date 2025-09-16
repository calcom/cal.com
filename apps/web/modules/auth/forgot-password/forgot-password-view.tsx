"use client";

// eslint-disable-next-line no-restricted-imports
import { Button } from "@calid/features/ui/components/button";
import { EmailField } from "@calid/features/ui/components/input/input";
import { debounce } from "lodash";
import Link from "next/link";
import type { SyntheticEvent } from "react";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

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
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <span className="text-2xl font-bold text-gray-900">Cal ID</span>
        </div>
        <h1 className="text-emphasis text-2xl font-bold">{t("reset_link_sent")}</h1>
        <p className="text-subtle mb-6">{t("password_reset_email", { email })}</p>
        <p className="text-subtle mb-8">{t("password_reset_leading")}</p>
        {error && <p className="mb-4 text-center text-red-600">{error.message}</p>}
        <Button color="primary" className="w-full justify-center py-3" href="/auth/login">
          {t("back_to_signin")}
        </Button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
      <div className="border-subtle max-w-lg rounded-2xl border p-8 shadow-xl">
        {success ? (
          <Success />
        ) : (
          <div className="text-center">
            {/* logo */}
            <div className="mb-8 flex justify-center">
              <span className="text-2xl font-bold text-gray-900">Cal ID</span>
            </div>

            <h1 className="text-emphasis text-3xl font-bold">{t("forgot_password")}</h1>
            <p className="text-subtle mb-8">{t("forgot_password_description")}</p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <input name="csrfToken" type="hidden" defaultValue={csrfToken} hidden />
              {error && <p className="text-sm text-red-600">{error.message}</p>}
              <div className="text-left">
                <EmailField
                  onChange={handleChange}
                  id="email"
                  name="email"
                  label={t("email_address")}
                  placeholder="john@example.com"
                  required
                />
              </div>
              <Button
                className="w-full justify-center py-3"
                type="submit"
                color="primary"
                disabled={loading}
                aria-label={t("request_password_reset")}
                loading={loading}>
                {t("request_password_reset")}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/auth/login" className="text-subtle hover:text-emphasis text-sm">
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
