import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import useEmailVerifyCheck from "@calcom/trpc/react/hooks/useEmailVerifyCheck";
import { Button, TopBanner, showToast } from "@calcom/ui";

import { useFlagMap } from "../../flags/context/provider";

function VerifyEmailBanner() {
  const flags = useFlagMap();
  const { t } = useLocale();
  const { data } = useEmailVerifyCheck();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();

  if (data?.isVerified || !flags["email-verification"]) return null;

  return (
    <>
      <TopBanner
        text={t("verify_email_banner_body", { appName: APP_NAME })}
        variant="warning"
        actions={
          <Button
            onClick={() => {
              mutation.mutate();
              showToast(t("email_sent"), "success");
            }}>
            {t("verify_email_banner_button")}
          </Button>
        }
      />
    </>
  );
}

export default VerifyEmailBanner;
