import { useRouter } from "next/router";

import { Button, SkeletonText } from "@calcom/ui";
import { FiArrowRight, FiCheck, FiMail } from "@calcom/ui/components/icon";

import AuthContainer from "@components/ui/AuthContainer";

const EmailVerified = () => {
  const router = useRouter();
  const { email, verificationToken } = router.query;

  // useEffect(() => {
  //   if (!email) {
  //     router.push("/auth/login");
  //   }
  // }, []);

  return verificationToken ? (
    <AuthContainer showLogo title="Email verified" description="The subtitle">
      <div className="space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <FiCheck className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="text-center text-lg font-medium leading-6 text-gray-900">
          Your email has been verified
        </h1>
        <Button className="w-full justify-center" onClick={() => router.push("/auth/login")}>
          Login <FiArrowRight />
        </Button>
      </div>
    </AuthContainer>
  ) : email ? (
    <AuthContainer showLogo title="Verification email sent" description="verification email">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <FiMail className="h-6 w-6 text-gray-600" />
        </div>
        <h1 className="text-lg font-medium leading-6 text-gray-900">
          We sent a verification email to {email}
        </h1>
        <p>Click the link inside to get started</p>
      </div>
    </AuthContainer>
  ) : (
    <AuthContainer showLogo title="Loading" description="Loading">
      <SkeletonText className="w-full" />
      <SkeletonText className="mt-2 w-full" />
    </AuthContainer>
  );
};

export default EmailVerified;
