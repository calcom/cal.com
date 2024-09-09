/// <reference types="react" />
export declare function DynamicComponent<T extends Record<string, React.ComponentType<any>>>(props: {
    componentMap: T;
    slug: string;
    wrapperClassName?: string;
}): JSX.Element | null;
//# sourceMappingURL=DynamicComponent.d.ts.map