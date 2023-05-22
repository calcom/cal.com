import { MailOpenIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { trpc } from "@calcom/trpc";
import useEmailVerifyCheck from "@calcom/trpc/react/hooks/useEmailVerifyCheck";
import { Button, EmptyScreen, showToast } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

function VerifyEmailPage() {
  const { data } = useEmailVerifyCheck();
  const { data: session } = useSession();
  const router = useRouter();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();

  useEffect(() => {
    if (!data?.requiresRedirect) {
      router.replace("/event-types");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.requiresRedirect]);

  return (
    <div className="h-[100vh] w-full ">
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="max-w-3xl">
          <EmptyScreen
            border
            dashedBorder={false}
            Icon={MailOpenIcon}
            headline="Check your email"
            description={`We’ve sent an email to ${session?.user.email}. Click the button in that email to confirm your email and continue.`}
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
