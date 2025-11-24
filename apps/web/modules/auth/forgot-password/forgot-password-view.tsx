"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { EmailField } from "@calid/features/ui/components/input/input";
import { Logo } from "@calid/features/ui/components/logo";
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
        body: JSON.stringify({ email, csrfToken }),
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
      <div className="fade-in-up text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#007ee5]/10">
          <Icon name="mail" className="h-8 w-8 text-active" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-default">{t("email_sent_raw")}</h1>
        <p className="text-emphasis mb-4 font-medium">
          A password reset link has been sent to <br />
          <strong className="text-emphasis font-semibold">{email}</strong>
        </p>
        <p className="text-default mb-8 text-sm">{t("password_reset_leading")}</p>
        <Button
          color="primary"
          className="w-full justify-center rounded-lg py-3"
          href="/auth/login">
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {t("back_to_signin")}
        </Button>
      </div>
    );
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

        * {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        body {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .btn-premium-submit {
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .btn-premium-submit:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(0, 126, 229, 0.45);
        }

        .btn-premium-submit:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 5px 20px rgba(0, 126, 229, 0.3);
        }

        .btn-premium-submit:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>

      <div className="dark:bg-default flex  min-h-screen flex-col items-center justify-center bg-[#F0F5FF] p-4">
        <div className="bg-default dark:border-gray-550 w-full max-w-7xl overflow-hidden rounded-3xl border shadow-xl md:max-w-[600px] dark:shadow-none">
          <div className="flex flex-col justify-center p-8 lg:p-12">
            {success ? (
              <Success />
            ) : (
              <>
                <div className="fade-in-up mb-8 flex items-start gap-3">
                  <Link href="/auth/login" className="text-emphasis mt-1 rounded-full p-0.5">
                    <Icon name="arrow-left" className="h-5 w-5" />
                  </Link>
                  <div className="flex flex-col">
                    <h1 className="text-emphasis mb-2 text-2xl font-bold">{t("account_recovery")}</h1>
                    <p className="text-default font-medium">{t("forgot_password_description")}</p>
                  </div>
                </div>

                <div className="fade-in-up space-y-6" style={{ animationDelay: "100ms" }}>
                  {error && (
                    <div className="rounded-lg bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-600">{error.message}</p>
                    </div>
                  )}

                  <div>
                    <EmailField
                      onChange={handleChange}
                      noLabel={true}
                      id="email"
                      name="email"
                      size="lg"
                      variant="floating"
                      prefixIcon="mail"
                      placeholder="Email Id"
                      required
                    />
                    <p className="text-emphasis mt-2 text-sm font-medium">
                      We will send a password reset link to this email address.
                    </p>
                  </div>

                  <Button
                    className="w-full justify-center py-3 "
                    type="button"
                    color="primary"
                    disabled={loading}
                    onClick={handleSubmit}
                    aria-label={t("request_password_reset")}
                    loading={loading}>
                    {loading ? "Sending Link..." : t("request_password_reset")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-center">
            <Logo small icon />
          </div>
        </div>
      </div>
    </>
  );
}
