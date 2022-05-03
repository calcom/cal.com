import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

import { ZapierSetup } from "@calcom/app-store/zapier/components";
import _packageZapier from "@calcom/app-store/zapier/package.json";

import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";

export default function SetupInformation() {
  const router = useRouter();
  const appName = router.query.appName;
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200">
        <Loader />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.replace({
      pathname: "/auth/login",
      query: {
        callbackUrl: `/apps/setup/${appName}`,
      },
    });
  }

  if (appName === _packageZapier.name.toLowerCase() && status === "authenticated") {
    return <ZapierSetup trpc={trpc}></ZapierSetup>;
  }

  return null;
}
