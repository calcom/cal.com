import type { AriaRole, ComponentType } from "react";
import React from "react";
type LicenseRequiredProps = {
    as?: keyof JSX.IntrinsicElements | "";
    className?: string;
    role?: AriaRole | undefined;
    children: React.ReactNode;
};
declare const LicenseRequired: ({ children, as, ...rest }: LicenseRequiredProps) => JSX.Element;
export declare const withLicenseRequired: <T extends JSX.IntrinsicAttributes>(Component: ComponentType<T>) => (hocProps: T) => JSX.Element;
export default LicenseRequired;
//# sourceMappingURL=LicenseRequired.d.ts.map