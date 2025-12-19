"use client";

import { Button } from "@calid/features/ui/components/button";
import { Logo } from "@calid/features/ui/components/logo";
import { triggerToast } from "@calid/features/ui/components/toast";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import useEmailVerifyCheck from "@calcom/trpc/react/hooks/useEmailVerifyCheck";

function VerifyEmailPage() {
  const { data } = useEmailVerifyCheck();
  const { data: session } = useSession();
  const router = useRouter();
  const { t, isLocaleReady } = useLocale();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();
  const [countdown, setCountdown] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (data?.isVerified) {
      router.replace("/getting-started");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.isVerified]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = () => {
    setShowConfirm(true);
    mutation.mutate();
    setCountdown(30);

    // Hide confirmation after 3 seconds
    setTimeout(() => setShowConfirm(false), 3000);
  };

  if (!isLocaleReady) {
    return null;
  }

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

        .btn-back:hover {
          transform: translateX(-2px);
        }

        .btn-back {
          transition: all 0.3s ease;
        }
      `}</style>

      <div className="dark:bg-default flex  min-h-screen flex-col items-center justify-center bg-[#F0F5FF] p-4">
        <div className="bg-default dark:border-gray-550 w-full max-w-7xl overflow-hidden rounded-3xl border shadow-xl md:max-w-[600px] dark:shadow-none">
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <div className="fade-in-up text-center" style={{ animationDelay: "100ms" }}>
              {/* Email Icon */}
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#007ee5]/10">
                  <svg
                    className="h-10 w-10 text-[#007ee5]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              {/* Header */}
              <h1 className="text-emphasis mb-2 text-2xl font-bold">{t("check_your_email")}</h1>
              <div className="mb-8 flex flex-col ">
                <p className="text-default mx-auto max-w-md">We've sent a verification link to </p>
                <span className="text-emphasis font-semibold">{session?.user?.email}</span>
              </div>

              {/* Action Buttons */}
              <div
                className="fade-in-up mb-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
                style={{ animationDelay: "200ms" }}>
                <Button
                  color="secondary"
                  onClick={async () => {
                    await signOut({ redirect: false });
                    router.replace("/auth/signup");
                  }}
                  className="btn-back justify-center rounded-lg border px-10 py-3 font-semibold">
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back
                </Button>

                <Button
                  color="secondary"
                  onClick={handleResendEmail}
                  disabled={countdown > 0 || mutation.isPending}
                  loading={mutation.isPending}
                  className="justify-center rounded-lg px-12 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-70">
                  {countdown > 0 ? `Resend Mail (${countdown}s)` : "Resend Mail"}
                </Button>
              </div>

              {/* Confirmation Message */}
              {showConfirm && (
                <div
                  className="fade-in-up mb-4 rounded-lg bg-green-50 p-3"
                  style={{ animationDelay: "300ms" }}>
                  <p className="flex items-center justify-center text-sm font-medium text-green-700">
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    New verification email sent!
                  </p>
                </div>
              )}

              {/* Login Link */}
              {/* <div className="fade-in-up mt-6" style={{ animationDelay: "400ms" }}>
                  <div className="text-center">
                    <span className="font-medium text-gray-600">Already have an account? </span>
                    <Link
                      href="/auth/login"
                      className="font-semibold text-[#007ee5] hover:text-[#006ac1] hover:underline">
                      Login
                    </Link>
                  </div>
                </div> */}
            </div>
          </div>
        </div>

        {/* Logo Footer */}
        <div className="mt-8">
          <div className="mb-4 flex items-center self-center lg:self-start">
            <Logo small icon />
          </div>
        </div>
      </div>
    </>
  );
}

export default VerifyEmailPage;
