import { useRouter } from "next/router";
import { useEffect, useRef } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { trpc } from "@calcom/trpc/react";
import type { App } from "@calcom/types/App";

import { InstallAppButtonMap } from "./apps.browser.generated";
import type { InstallAppButtonProps } from "./types";

export const InstallAppButtonWithoutPlanCheck = (
  props: {
    type: App["type"];
  } & InstallAppButtonProps
) => {
  const key = deriveAppDictKeyFromType(props.type, InstallAppButtonMap);
  const InstallAppButtonComponent = InstallAppButtonMap[key as keyof typeof InstallAppButtonMap];
  if (!InstallAppButtonComponent) return <>{props.render({ useDefaultComponent: true })}</>;

  return <InstallAppButtonComponent render={props.render} onChanged={props.onChanged} />;
};

export const InstallAppButton = (
  props: {
    isProOnly?: App["isProOnly"];
    type: App["type"];
    wrapperClassName?: string;
  } & InstallAppButtonProps
) => {
  const { isLoading, data: user } = trpc.viewer.me.useQuery();
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
      },
      true
    );
  }, [isLoading, user, router, props.isProOnly]);

  if (isLoading) {
    return null;
  }

  return (
    <div ref={proProtectionElementRef} className={props.wrapperClassName}>
      <InstallAppButtonWithoutPlanCheck {...props} />
    </div>
  );
};

export { AppConfiguration } from "./_components/AppConfiguration";
