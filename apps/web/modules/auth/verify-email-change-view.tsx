"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import React from "react";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { showToast } from "@calcom/ui";

import type { getServerSideProps } from "@server/lib/auth/verify-email-change/getServerSideProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

function VerifyEmailChange(props: PageProps) {
  const { update } = useSession();
  const { t, isLocaleReady } = useLocale();
  const router = useRouter();

  useEffect(() => {
    async function updateSessionAndDisplayToast() {
      await update({ email: props.updatedEmail });
      if (isLocaleReady) {
        showToast(t("verify_email_change_success_toast", { email: props.updatedEmail }), "success");
      }
      router.push("/event-types");
    }
    if (props.updateSession) {
      updateSessionAndDisplayToast();
    } else {
      if (isLocaleReady) {
        showToast(t("verify_email_change_failure_toast"), "error");
      }
    }
    // We only need this to run on inital mount. These props can't and won't change due to it being fetched serveside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Toaster position="bottom-right" />
    </div>
  );
}

export default VerifyEmailChange;
