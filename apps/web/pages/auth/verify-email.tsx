import { MailOpenIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { Button, EmptyScreen } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

function VerifyEmailPage() {
  const { data } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (data?.user.emailVerified) {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.user.emailVerified]);

  return (
    <div className="h-[100vh] w-full ">
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="max-w-3xl">
          <EmptyScreen
            border
            dashedBorder={false}
            Icon={MailOpenIcon}
            headline="Check your email"
            description={`We’ve sent an email to ${data?.user.email}. Click the button in that email to confirm your email and continue.`}
            className="bg-default"
            buttonRaw={
              <Button color="minimal" className="underline">
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
