"use client";

import { Button } from "@calid/features/ui/components/button";
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
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("email_sent_raw")}</h1>
        <p className="mb-4 font-medium text-gray-600">
          A password reset link has been sent to <br />
          <strong className="font-semibold text-gray-800">{email}</strong>
        </p>
        <p className="mb-8 text-sm text-gray-600">{t("password_reset_leading")}</p>
        <Button
          color="primary"
          className="btn-premium-submit w-full justify-center rounded-lg bg-[#007ee5] py-3 font-semibold text-white hover:bg-[#006ac1]"
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

      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F0F5FF] p-4">
        <div className="w-full max-w-7xl overflow-hidden rounded-3xl border-0 bg-white shadow-xl">
          <div className="grid min-h-[600px] grid-cols-1 lg:grid-cols-2">
            {/* Left Column - Recovery Form */}
            <div className="flex flex-col justify-center p-8 lg:p-12">
              {success ? (
                <Success />
              ) : (
                <>
                  <div className="fade-in-up mb-8 flex items-start gap-3">
                    <Link
                      href="/auth/login"
                      className="mt-1 rounded-full bg-blue-50/50 p-0.5 px-2 text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-800">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                      </svg>
                    </Link>
                    <div className="flex flex-col">
                      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("account_recovery")}</h1>
                      <p className="font-medium text-gray-600">{t("forgot_password_description")}</p>
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
                        id="email"
                        name="email"
                        size="lg"
                        variant="floating"
                        prefixIcon="mail"
                        placeholder="Email Id"
                        required
                      />
                      <p className="mt-2 text-sm font-medium text-gray-600">
                        We will send a password reset link to this email address.
                      </p>
                    </div>

                    <Button
                      className="btn-premium-submit w-full justify-center rounded-lg bg-[#007ee5] py-3 font-semibold text-white hover:bg-[#006ac1]"
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

            {/* Right Column - Image */}
            <div
              className="m-6 hidden min-h-[600px] w-full items-center justify-center overflow-hidden rounded-2xl p-6 lg:flex"
              style={{
                backgroundImage: "url('https://images.pexels.com/photos/4049992/pexels-photo-4049992.jpeg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}></div>
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
