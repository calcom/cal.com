import { useRouter } from "next/router";

import { ZapierSetup } from "@calcom/app-store/zapierother/components";
import _packageZapier from "@calcom/app-store/zapierother/package.json";

import { trpc } from "@lib/trpc";

export default function SetupInformation() {
  const router = useRouter();
  const appName = router.query.appName;

  if (appName === _packageZapier.name.toLowerCase()) {
    return <ZapierSetup trpc={trpc}></ZapierSetup>;
  }

  return null;
}
