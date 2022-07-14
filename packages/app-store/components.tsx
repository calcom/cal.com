import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";

import { trpc } from "@lib/trpc";

import { UpgradeToProDialog } from "@components/UpgradeToProDialog";

import { InstallAppButtonMap } from "./apps.browser.generated";
import { InstallAppButtonProps } from "./types";

function InstallAppButtonWithoutPlanCheck(
  props: {
    type: App["type"];
  } & InstallAppButtonProps
) {
  const key = deriveAppDictKeyFromType(props.type, InstallAppButtonMap);
  const InstallAppButtonComponent = InstallAppButtonMap[key as keyof typeof InstallAppButtonMap];
  if (!InstallAppButtonComponent) return <>{props.render({ useDefaultComponent: true })}</>;

  return <InstallAppButtonComponent render={props.render} onChanged={props.onChanged} />;
}
export const InstallAppButton = (
  props: {
    isProOnly?: App["isProOnly"];
    type: App["type"];
  } & InstallAppButtonProps
) => {
  const { isLoading, data: user } = trpc.useQuery(["viewer.me"]);
  const { t } = useLocale();
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const proProtectionElementRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = proProtectionElementRef.current;
    if (!el) {
      return;
    }
    el.addEventListener(
      "click",
      (e) => {
        if (!user) {
          router.push(
            `${WEBAPP_URL}/auth/login?callbackUrl=${WEBAPP_URL + location.pathname + location.search}`
          );
          e.stopPropagation();
          return;
        }
        if (user.plan === "FREE" && props.isProOnly) {
          setModalOpen(true);
          e.stopPropagation();
          return;
        }
      },
      true
    );
  }, [isLoading, user, router, props.isProOnly]);

  if (isLoading) {
    return null;
  }

  return (
    <div ref={proProtectionElementRef}>
      <InstallAppButtonWithoutPlanCheck {...props} />
      <UpgradeToProDialog modalOpen={modalOpen} setModalOpen={setModalOpen}>
        {t("app_upgrade_description")}
      </UpgradeToProDialog>
    </div>
  );
};

export { AppConfiguration } from "./_components/AppConfiguration";
