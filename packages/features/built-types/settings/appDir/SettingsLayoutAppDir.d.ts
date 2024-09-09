import type { ComponentProps } from "react";
import React from "react";
import Shell from "@calcom/features/shell/Shell";
export default function SettingsLayout({ children, ...rest }: {
    children: React.ReactNode;
} & ComponentProps<typeof Shell>): JSX.Element;
export declare const getLayout: (page: React.ReactElement) => JSX.Element;
//# sourceMappingURL=SettingsLayoutAppDir.d.ts.map