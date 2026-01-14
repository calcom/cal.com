"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import SSOConfiguration from "../components/SSOConfiguration";

const SAMLSSO = () => {
  const { t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (HOSTED_CAL_FEATURES) {
      router.push("/404");
    }
  }, []);

  return (
    <div className="bg-default w-full sm:mx-0">
      <SSOConfiguration teamId={null} />
    </div>
  );
};

export default SAMLSSO;
