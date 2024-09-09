import type { TFunction } from "next-i18next";
import type { Dispatch, SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { _EventTypeModel } from "@calcom/prisma/zod/eventtype";
export declare const LockedSwitch: (isManagedEventType: boolean, [fieldState, setFieldState]: [Record<string, boolean>, Dispatch<SetStateAction<Record<string, boolean>>>], fieldName: string, setUnlockedFields: (fieldName: string, val: boolean | undefined) => void, options?: {
    simple: boolean;
}) => JSX.Element | null;
export declare const LockedIndicator: (isChildrenManagedEventType: boolean, isManagedEventType: boolean, [fieldState, setFieldState]: [Record<string, boolean>, Dispatch<SetStateAction<Record<string, boolean>>>], t: TFunction, fieldName: string, setUnlockedFields: (fieldName: string, val: boolean | undefined) => void, options?: {
    simple: boolean;
}) => false | JSX.Element;
declare const useLockedFieldsManager: ({ eventType, translate, formMethods, }: {
    eventType: Pick<z.infer<typeof _EventTypeModel>, "schedulingType" | "userId" | "metadata" | "id">;
    translate: TFunction;
    formMethods: UseFormReturn<FormValues>;
}) => {
    shouldLockIndicator: (fieldName: string, options?: {
        simple: true;
    }) => false | JSX.Element;
    shouldLockDisableProps: (fieldName: string, options?: {
        simple: true;
    }) => {
        disabled: boolean;
        LockedIcon: false | JSX.Element;
        isLocked: boolean;
    };
    useLockedLabel: (fieldName: string, options?: {
        simple: true;
    }) => {
        disabled: boolean;
        LockedIcon: false | JSX.Element;
        isLocked: boolean;
    };
    useLockedSwitch: (fieldName: string, options?: {
        simple: boolean;
    }) => () => JSX.Element | null;
    isManagedEventType: boolean;
    isChildrenManagedEventType: boolean;
};
export default useLockedFieldsManager;
//# sourceMappingURL=useLockedFieldsManager.d.ts.map