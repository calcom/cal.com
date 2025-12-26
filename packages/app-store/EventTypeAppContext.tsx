import React from "react";
import type { z, ZodTypeAny } from "zod";

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

 
const EventTypeAppContext = React.createContext<AppContext>({
  getAppData: () => ({}),
  setAppData: () => ({}),
});

// In zod v4, ZodTypeAny is used instead of ZodType to avoid z.infer returning 'never'
type SetAppDataGeneric<TAppData extends ZodTypeAny> = <
  TKey extends keyof z.output<TAppData>,
  TValue extends z.output<TAppData>[TKey]
>(
  key: TKey,
  value: TValue
) => void;

type GetAppDataGeneric<TAppData extends ZodTypeAny> = <TKey extends keyof z.output<TAppData>>(
  key: TKey
) => z.output<TAppData>[TKey];

export const useAppContextWithSchema = <TAppData extends ZodTypeAny = ZodTypeAny>() => {
  type GetAppData = GetAppDataGeneric<TAppData>;
  type SetAppData = SetAppDataGeneric<TAppData>;
  // TODO: Not able to do it without type assertion here
  const context = React.useContext(EventTypeAppContext) as {
    getAppData: GetAppData;
    setAppData: SetAppData;
    LockedIcon: LockedIcon;
    disabled: Disabled;
  };
  return context;
};
export default EventTypeAppContext;
