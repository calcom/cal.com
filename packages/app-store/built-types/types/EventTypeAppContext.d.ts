import React from "react";
import type { z, ZodType } from "zod";
export type GetAppData = (key: string) => unknown;
export type SetAppData = (key: string, value: unknown) => void;
type LockedIcon = JSX.Element | false | undefined;
type Disabled = boolean | undefined;
type AppContext = {
    getAppData: GetAppData;
    setAppData: SetAppData;
    LockedIcon?: LockedIcon;
    disabled?: Disabled;
};
declare const EventTypeAppContext: React.Context<AppContext>;
type SetAppDataGeneric<TAppData extends ZodType> = <TKey extends keyof z.infer<TAppData>, TValue extends z.infer<TAppData>[TKey]>(key: TKey, value: TValue) => void;
type GetAppDataGeneric<TAppData extends ZodType> = <TKey extends keyof z.infer<TAppData>>(key: TKey) => z.infer<TAppData>[TKey];
export declare const useAppContextWithSchema: <TAppData extends z.ZodType<any, z.ZodTypeDef, any>>() => {
    getAppData: GetAppDataGeneric<TAppData>;
    setAppData: SetAppDataGeneric<TAppData>;
    LockedIcon: LockedIcon;
    disabled: Disabled;
};
export default EventTypeAppContext;
//# sourceMappingURL=EventTypeAppContext.d.ts.map