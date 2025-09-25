"use client";

import { Button } from "@calid/features/ui/components/button";
import { Logo } from "@calid/features/ui/components/logo";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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

  useEffect(() => {
    if (data?.isVerified) {
      router.replace("/getting-started");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.isVerified]);
  if (!isLocaleReady) {
    return null;
  }
  return (
    <div className="bg-default flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="border-default w-full max-w-lg rounded-2xl border p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-emphasis text-3xl font-bold">{t("check_your_email")}</h1>
          <p className="text-subtle mt-2">
            {t("verify_email_page_body", { email: session?.user?.email, appName: APP_NAME })}
          </p>
        </div>

        {/* Resend Button */}
        <div className="text-center">
          <Button
            color="minimal"
            loading={mutation.isPending}
            onClick={() => {
              triggerToast(t("send_email"), "success");
              mutation.mutate();
            }}>
            {t("resend_email")}
          </Button>
        </div>
      </div>

      {/* Logo Footer */}
      <div className="mt-8">
        <div className="mb-8 flex justify-center">
          <Logo small icon />
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
