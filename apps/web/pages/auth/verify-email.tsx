import { MailOpenIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import useEmailVerifyCheck from "@calcom/trpc/react/hooks/useEmailVerifyCheck";
import { Button, EmptyScreen, showToast } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

function VerifyEmailPage() {
  const { data } = useEmailVerifyCheck();
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLocale();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();

  useEffect(() => {
    if (data?.isVerified) {
      router.replace("/getting-started");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.isVerified]);

  return (
    <div className="h-[100vh] w-full ">
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="max-w-3xl">
          <EmptyScreen
            border
            dashedBorder={false}
            Icon={MailOpenIcon}
            headline={t("check_your_email")}
            description={t("verify_email_page_body", { email: session?.user?.email, appName: APP_NAME })}
            className="bg-default"
            buttonRaw={
              <Button
                color="minimal"
                className="underline"
                loading={mutation.isLoading}
                onClick={() => {
                  showToast("Send email", "success");
                  mutation.mutate();
                }}>
                Resend Email
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;

VerifyEmailPage.PageWrapper = PageWrapper;
