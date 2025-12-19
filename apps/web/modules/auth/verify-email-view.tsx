"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";

import { useFlagMap } from "@calcom/features/flags/context/provider";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import useEmailVerifyCheck from "@calcom/trpc/react/hooks/useEmailVerifyCheck";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";

const EMAIL_CLIENTS = [
  {
    name: "Gmail",
    icon: "/email-clients/gmail.svg",
    href: 'https://mail.google.com/mail/u/0/#search/%22api%2Fauth%2Fverify-email%22',
  },
  {
    name: "Outlook",
    icon: "/email-clients/outlook.svg",
    href: "https://outlook.live.com/mail/0/",
  },
  {
    name: "Yahoo",
    icon: "/email-clients/yahoo.svg",
    href: "https://mail.yahoo.com/d/search?p=Cal.com",
  },
  {
    name: "Proton",
    icon: "/email-clients/proton.svg",
    href: "https://mail.proton.me",
  },
] as const;

function VerifyEmailPage() {
  const { data } = useEmailVerifyCheck();
  const { data: session } = useSession();
  const router = useRouter();
  const { t, isLocaleReady } = useLocale();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();
  const flags = useFlagMap();

  useEffect(() => {
    if (data?.isVerified) {
      posthog.capture("verify_email_already_verified", {
        onboarding_v3_enabled: flags["onboarding-v3"],
      });
      const gettingStartedPath = flags["onboarding-v3"] ? "/onboarding/getting-started" : "/getting-started";
      router.replace(gettingStartedPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.isVerified, flags]);
  if (!isLocaleReady) {
    return null;
  }
  return (
    <div className="h-screen w-full ">
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="max-w-3xl">
          <EmptyScreen
            border
            dashedBorder={false}
            Icon="mail-open"
            headline={t("check_your_email")}
            description={t("verify_email_page_body", { email: session?.user?.email, appName: APP_NAME })}
            className="bg-default"
            buttonRaw={
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {EMAIL_CLIENTS.map(({ name, icon, href }) => (
                    <Button
                      key={name}
                      color="secondary"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer">
                      <img src={icon} alt={name} className="me-1 h-4 w-4" /> {name}
                    </Button>
                  ))}
                </div>
                <Button
                  color="minimal"
                  loading={mutation.isPending}
                  onClick={() => {
                    posthog.capture("verify_email_resend_clicked");
                    showToast(t("send_email"), "success");
                    mutation.mutate();
                  }}>
                  {t("resend_email")}
                </Button>
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
