import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { TopBanner, showToast } from "@calcom/ui";
import { Mail } from "@calcom/ui/components/icon";

import { useFlagMap } from "../../flags/context/provider";

function VerifyEmailBanner({
  data,
}: {
  data: RouterOutputs["viewer"]["getUserTopBanners"]["verifyEmailBanner"];
}) {
  const flags = useFlagMap();
  const { t } = useLocale();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();

  if (!data || (data && data.isVerified) || !flags["email-verification"]) return null;

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
