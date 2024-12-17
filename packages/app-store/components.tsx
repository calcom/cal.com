"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import type { UseAddAppMutationOptions } from "@calcom/app-store/_utils/useAddAppMutation";
import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import classNames from "@calcom/lib/classNames";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { useHasTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { App } from "@calcom/types/App";
import { Icon } from "@calcom/ui";

import { InstallAppButtonMap } from "./apps.browser.generated";
import type { InstallAppButtonProps } from "./types";

export const InstallAppButtonWithoutPlanCheck = (
  props: {
    type: App["type"];
    options?: UseAddAppMutationOptions;
  } & InstallAppButtonProps
) => {
  const mutation = useAddAppMutation(null, props.options);
  const key = deriveAppDictKeyFromType(props.type, InstallAppButtonMap);
  const InstallAppButtonComponent = InstallAppButtonMap[key as keyof typeof InstallAppButtonMap];
  if (!InstallAppButtonComponent)
    return (
      <>
        {props.render({
          useDefaultComponent: true,
          disabled: props.disableInstall,
          onClick: () => {
            mutation.mutate({ type: props.type });
          },
          loading: mutation.data?.setupPending,
        })}
      </>
    );

  return (
    <InstallAppButtonComponent
      render={props.render}
      onChanged={props.onChanged}
      disableInstall={props.disableInstall}
    />
  );
};

export const InstallAppButton = (
  props: {
    teamsPlanRequired?: App["teamsPlanRequired"];
    type: App["type"];
    wrapperClassName?: string;
    disableInstall?: boolean;
  } & InstallAppButtonProps
) => {
  const { isPending: isUserLoading, data: user } = trpc.viewer.me.useQuery();
  const router = useRouter();
  const proProtectionElementRef = useRef<HTMLDivElement | null>(null);
  const { isPending: isTeamPlanStatusLoading, hasTeamPlan } = useHasTeamPlan();

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

        if (props.teamsPlanRequired && !hasTeamPlan) {
          // TODO: I think we should show the UpgradeTip in a Dialog here. This would solve the problem of no way to go back to the App page from the UpgradeTip page(except browser's back button)
          router.push(props.teamsPlanRequired.upgradeUrl);
          e.stopPropagation();
          return;
        }
      },
      true
    );
  }, [isUserLoading, user, router, hasTeamPlan, props.teamsPlanRequired]);

  if (isUserLoading || isTeamPlanStatusLoading) {
    return null;
  }

  return (
    <div ref={proProtectionElementRef} className={props.wrapperClassName}>
      <InstallAppButtonWithoutPlanCheck {...props} />
    </div>
  );
};

export { AppConfiguration } from "./_components/AppConfiguration";

export const AppDependencyComponent = ({
  appName,
  dependencyData,
}: {
  appName: string;
  dependencyData: RouterOutputs["viewer"]["appsRouter"]["queryForDependencies"];
}) => {
  const { t } = useLocale();

  return (
    <div
      className={classNames(
        "rounded-md px-4 py-3",
        dependencyData && dependencyData.some((dependency) => !dependency.installed) ? "bg-info" : "bg-subtle"
      )}>
      {dependencyData &&
        dependencyData.map((dependency) => {
          return dependency.installed ? (
            <div className="items-start space-x-2.5">
              <div className="flex items-start">
                <div>
                  <Icon name="check" className="mr-2 mt-1 font-semibold" />
                </div>
                <div>
                  <span className="font-semibold">
                    {t("app_is_connected", { dependencyName: dependency.name })}
                  </span>
                  <div>
                    <div>
                      <span>
                        {t("this_app_requires_connected_account", {
                          appName,
                          dependencyName: dependency.name,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="items-start space-x-2.5">
              <div className="text-info flex items-start">
                <div>
                  <Icon name="circle-alert" className="mr-2 mt-1 font-semibold" />
                </div>
                <div>
                  <span className="font-semibold">
                    {t("this_app_requires_connected_account", { appName, dependencyName: dependency.name })}
                  </span>

                  <div>
                    <div>
                      <>
                        <Link
                          href={`${WEBAPP_URL}/apps/${dependency.slug}`}
                          className="text-info flex items-center underline">
                          <span className="mr-1">
                            {t("connect_app", { dependencyName: dependency.name })}
                          </span>
                          <Icon name="arrow-right" />
                        </Link>
                      </>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};
