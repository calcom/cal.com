"use client";

import { useState, useEffect } from "react";
import type { UseAddAppMutationOptions } from "@calcom/app-store/_utils/useAddAppMutation";
import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import type { App } from "@calcom/types/App";

import type { InstallAppButtonProps } from "./types";

export const InstallAppButtonWithoutPlanCheck = (
  props: {
    type: App["type"];
    options?: UseAddAppMutationOptions;
  } & InstallAppButtonProps
) => {
  const mutation = useAddAppMutation(null, props.options);

  const [InstallAppButtonComponent, setInstallAppButtonComponent] = useState<React.ElementType | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadComponent() {
      try {
        // Dynamic import breaks the webpack bundle chain
        const mod = await import("./apps.browser.generated");
        const map = mod.InstallAppButtonMap;

        // Logic from previous version
        const key = deriveAppDictKeyFromType(props.type, map);
        // @ts-expect-error - The map keys are complex, but this runtime check is safe
        const Component = map[key];

        if (isMounted && Component) {
          setInstallAppButtonComponent(() => Component);
        }
      } catch (e) {
        console.error("Failed to load app button map", e);
      }
    }

    loadComponent();

    return () => { isMounted = false; };
  }, [props.type]);

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
