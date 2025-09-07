"use client";

import Link from "next/link";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";

export const AppDependencyComponent = ({
  appName,
  dependencyData,
}: {
  appName: string;
  dependencyData: RouterOutputs["viewer"]["apps"]["queryForDependencies"];
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
                          interpolation: { escapeValue: false },
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
                    {t("this_app_requires_connected_account", {
                      appName,
                      dependencyName: dependency.name,
                      interpolation: { escapeValue: false },
                    })}
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
