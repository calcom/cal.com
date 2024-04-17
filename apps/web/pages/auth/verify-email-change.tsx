"use client";

import type { GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

interface PageProps {
  token: string;
  updateSession: string;
  updatedEmail: string;
}

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

const tokenSchema = z.object({
  token: z.string(),
});

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { token } = tokenSchema.parse(context.query);

  if (!token) {
    return {
      notFound: true,
    };
  }

  const params = new URLSearchParams({
    token,
  });

  const response = await fetch(`${WEBAPP_URL}/api/auth/verify-email?${params.toString()}`, {
    method: "POST",
  });

  if (!response.ok) {
    return {
      props: {
        updateSession: false,
        token,
        updatedEmail: false,
      },
    };
  }

  const data = await response.json();

  return {
    props: {
      updateSession: true,
      token,
      updatedEmail: data.updatedEmail ?? null,
    },
  };
}

export default VerifyEmailChange;
VerifyEmailChange.PageWrapper = PageWrapper;
