import type { ComponentProps } from "react";
import React from "react";
import Shell from "@calcom/features/shell/Shell";
export default function SettingsLayout({ children, hideHeader, ...rest }: {
    children: React.ReactNode;
    hideHeader?: boolean;
} & ComponentProps<typeof Shell>): JSX.Element;
export declare const getLayout: (page: React.ReactElement) => JSX.Element;
export declare function ShellHeader(): JSX.Element;
//# sourceMappingURL=SettingsLayout.d.ts.map