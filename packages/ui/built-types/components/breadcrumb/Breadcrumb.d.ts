/// <reference types="react" />
type BreadcrumbProps = {
    children: React.ReactNode;
};
export declare const Breadcrumb: ({ children }: BreadcrumbProps) => JSX.Element;
type BreadcrumbItemProps = {
    children: React.ReactNode;
    href: string;
    listProps?: JSX.IntrinsicElements["li"];
};
export declare const BreadcrumbItem: ({ children, href, listProps }: BreadcrumbItemProps) => JSX.Element;
export declare const BreadcrumbContainer: () => void;
export default Breadcrumb;
//# sourceMappingURL=Breadcrumb.d.ts.map