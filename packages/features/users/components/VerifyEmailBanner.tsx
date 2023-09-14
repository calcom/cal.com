import { useSession } from "next-auth/react";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import useEmailVerifyCheck from "@calcom/trpc/react/hooks/useEmailVerifyCheck";
import { TopBanner, showToast } from "@calcom/ui";
import { Mail } from "@calcom/ui/components/icon";

import { useFlagMap } from "../../flags/context/provider";

function VerifyEmailBanner() {
  const flags = useFlagMap();
  const { t } = useLocale();
  const { data, isLoading } = useEmailVerifyCheck();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();
  const session = useSession();
  const isLoggedIn = session?.data?.user;

  if (!isLoggedIn || isLoading || data?.isVerified || !flags["email-verification"]) return null;

  return (
    <>
      <TopBanner
        Icon={Mail}
        text={t("verify_email_banner_body", { appName: APP_NAME })}
        variant="warning"
        actions={
          <a
            className="underline hover:cursor-pointer"
            onClick={() => {
              mutation.mutate();
              showToast(t("email_sent"), "success");
            }}>
            {t("resend_email")}
          </a>
        }
      />
    </>
  );
}

export default VerifyEmailBanner;
