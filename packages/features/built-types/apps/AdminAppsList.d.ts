/// <reference types="react" />
declare const AdminAppsList: ({ baseURL, className, useQueryParam, classNames, onSubmit, ...rest }: {
    baseURL: string;
    classNames?: {
        form?: string | undefined;
        appCategoryNavigationRoot?: string | undefined;
        appCategoryNavigationContainer?: string | undefined;
        verticalTabsItem?: string | undefined;
    } | undefined;
    className?: string | undefined;
    useQueryParam?: boolean | undefined;
    onSubmit?: (() => void) | undefined;
} & Omit<import("react").DetailedHTMLProps<import("react").FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>, "onSubmit">) => JSX.Element;
export default AdminAppsList;
//# sourceMappingURL=AdminAppsList.d.ts.map