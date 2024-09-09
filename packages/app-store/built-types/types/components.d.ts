/// <reference types="react" />
import type { UseAddAppMutationOptions } from "@calcom/app-store/_utils/useAddAppMutation";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { App } from "@calcom/types/App";
import type { InstallAppButtonProps } from "./types";
export declare const InstallAppButtonWithoutPlanCheck: (props: {
    type: App["type"];
    options?: UseAddAppMutationOptions;
} & InstallAppButtonProps) => JSX.Element;
export declare const InstallAppButton: (props: {
    teamsPlanRequired?: App["teamsPlanRequired"];
    type: App["type"];
    wrapperClassName?: string;
    disableInstall?: boolean;
} & InstallAppButtonProps) => JSX.Element | null;
export { AppConfiguration } from "./_components/AppConfiguration";
export declare const AppDependencyComponent: ({ appName, dependencyData, }: {
    appName: string;
    dependencyData: RouterOutputs["viewer"]["appsRouter"]["queryForDependencies"];
}) => JSX.Element;
//# sourceMappingURL=components.d.ts.map