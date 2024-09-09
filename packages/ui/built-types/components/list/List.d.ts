/// <reference types="react" />
export type ListProps = {
    roundContainer?: boolean;
    noBorderTreatment?: boolean;
} & JSX.IntrinsicElements["ul"];
export declare function List(props: ListProps): JSX.Element;
export type ListItemProps = {
    expanded?: boolean;
    rounded?: boolean;
} & ({
    href?: never;
} & JSX.IntrinsicElements["li"]);
export declare function ListItem(props: ListItemProps): JSX.Element;
export type ListLinkItemProps = {
    href: string;
    heading: string;
    subHeading: string;
    disabled?: boolean;
    actions?: JSX.Element;
} & JSX.IntrinsicElements["li"];
export declare function ListLinkItem(props: ListLinkItemProps): JSX.Element;
export declare function ListItemTitle<TComponent extends keyof JSX.IntrinsicElements = "span">(props: JSX.IntrinsicElements[TComponent] & {
    component?: TComponent;
}): import("react").ReactElement<Omit<JSX.IntrinsicElements[TComponent] & {
    component?: TComponent | undefined;
}, "component"> & {
    className: string;
    "data-testid": string;
}, string | import("react").JSXElementConstructor<any>>;
export declare function ListItemText<TComponent extends keyof JSX.IntrinsicElements = "span">(props: JSX.IntrinsicElements[TComponent] & {
    component?: TComponent;
}): import("react").ReactElement<Omit<JSX.IntrinsicElements[TComponent] & {
    component?: TComponent | undefined;
}, "component"> & {
    className: string;
    "data-testid": string;
}, string | import("react").JSXElementConstructor<any>>;
//# sourceMappingURL=List.d.ts.map