/// <reference types="react" />
declare const AppCategoryNavigation: ({ baseURL, children, containerClassname, className, classNames, useQueryParam, }: {
    baseURL: string;
    children: React.ReactNode;
    /** @deprecated use classNames instead */
    containerClassname?: string | undefined;
    /** @deprecated use classNames instead */
    className?: string | undefined;
    classNames?: {
        root?: string | undefined;
        container?: string | undefined;
        verticalTabsItem?: string | undefined;
    } | undefined;
    useQueryParam?: boolean | undefined;
}) => JSX.Element;
export default AppCategoryNavigation;
//# sourceMappingURL=AppCategoryNavigation.d.ts.map