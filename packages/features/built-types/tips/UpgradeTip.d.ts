import type { ReactNode } from "react";
export declare function UpgradeTip({ title, description, background, features, buttons, isParentLoading, children, plan, }: {
    title: string;
    description: string;
    background: string;
    features: Array<{
        icon: JSX.Element;
        title: string;
        description: string;
    }>;
    buttons?: JSX.Element;
    /**Chldren renders when the user is in a team */
    children: JSX.Element;
    isParentLoading?: ReactNode;
    plan: "team" | "enterprise";
}): JSX.Element;
//# sourceMappingURL=UpgradeTip.d.ts.map