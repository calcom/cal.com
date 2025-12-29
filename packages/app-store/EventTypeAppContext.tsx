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

type TypedAppContext<TAppData extends ZodTypeAny> = {
  getAppData: GetAppDataGeneric<TAppData>;
  setAppData: SetAppDataGeneric<TAppData>;
  LockedIcon: LockedIcon;
  disabled: Disabled;
};

type UntypedAppContext = {
  getAppData: GetAppData;
  setAppData: SetAppData;
  LockedIcon: LockedIcon;
  disabled: Disabled;
};

// Overload order matters: non-generic must come first for zero-arg calls to resolve correctly
export function useAppContextWithSchema(): UntypedAppContext;
export function useAppContextWithSchema<TAppData extends ZodTypeAny>(): TypedAppContext<TAppData>;
export function useAppContextWithSchema<TAppData extends ZodTypeAny>() {
  const context = React.useContext(EventTypeAppContext) as TypedAppContext<TAppData> | UntypedAppContext;
  return context;
}

export default EventTypeAppContext;
