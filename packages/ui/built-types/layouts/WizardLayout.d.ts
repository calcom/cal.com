import React from "react";
export declare function WizardLayout({ children, maxSteps, currentStep, isOptionalCallback, }: {
    children: React.ReactNode;
} & {
    maxSteps?: number;
    currentStep?: number;
    isOptionalCallback?: () => void;
}): JSX.Element;
export declare const getLayout: (page: React.ReactElement) => JSX.Element;
//# sourceMappingURL=WizardLayout.d.ts.map