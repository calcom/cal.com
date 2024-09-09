import type { ComponentProps } from "react";
import React from "react";
import Shell from "@calcom/features/shell/Shell";
export default function MainLayout({ children, ...rest }: {
    children: React.ReactNode;
} & ComponentProps<typeof Shell>): JSX.Element;
export declare const getLayout: (page: React.ReactElement) => JSX.Element;
//# sourceMappingURL=MainLayoutAppDir.d.ts.map