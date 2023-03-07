import { useRouter } from "next/router";

import { Button } from "@calcom/ui";
import { FiArrowRight, FiCheck } from "@calcom/ui/components/icon";

import AuthContainer from "@components/ui/AuthContainer";

const EmailVerified = () => {
  const router = useRouter();

  return (
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
  );
};

export default EmailVerified;
