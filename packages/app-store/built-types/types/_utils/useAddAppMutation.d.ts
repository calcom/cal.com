import type { UseMutationOptions } from "@tanstack/react-query";
import type { App } from "@calcom/types/App";
type CustomUseMutationOptions = Omit<UseMutationOptions<unknown, unknown, unknown, unknown>, "mutationKey" | "mutationFn" | "onSuccess"> | undefined;
type AddAppMutationData = {
    setupPending: boolean;
} | void;
export type UseAddAppMutationOptions = CustomUseMutationOptions & {
    onSuccess?: (data: AddAppMutationData) => void;
    installGoogleVideo?: boolean;
    returnTo?: string;
};
declare function useAddAppMutation(_type: App["type"] | null, options?: UseAddAppMutationOptions): import("@tanstack/react-query/build/legacy/types").UseMutationResult<AddAppMutationData, Error, "" | {
    type?: `${string}_other` | `${string}_calendar` | `${string}_messaging` | `${string}_payment` | `${string}_video` | `${string}_automation` | `${string}_analytics` | `${string}_crm` | `${string}_other_calendar` | undefined;
    variant?: string | undefined;
    slug?: string | undefined;
    teamId?: number | undefined;
    returnTo?: string | undefined;
    defaultInstall?: boolean | undefined;
}, unknown>;
export default useAddAppMutation;
//# sourceMappingURL=useAddAppMutation.d.ts.map