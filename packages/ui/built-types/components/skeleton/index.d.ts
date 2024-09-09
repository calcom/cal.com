import React from "react";
type SkeletonBaseProps = {
    className?: string;
};
interface SkeletonContainer {
    as?: keyof JSX.IntrinsicElements;
    children?: React.ReactNode;
    className?: string;
}
type SkeletonLoaderProps = {
    className: string;
};
declare const SkeletonAvatar: React.FC<SkeletonBaseProps>;
type SkeletonProps<T> = {
    as: keyof JSX.IntrinsicElements | React.FC;
    className?: string;
    children: React.ReactNode;
    loading?: boolean;
    waitForTranslation?: boolean;
    loadingClassName?: string;
} & (T extends React.FC<infer P> ? P : T extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[T] : never);
declare const Skeleton: <T extends keyof JSX.IntrinsicElements | React.FC<{}>>({ as, className, children, loading, waitForTranslation, loadingClassName, ...rest }: SkeletonProps<T>) => JSX.Element;
declare const SkeletonText: React.FC<SkeletonBaseProps & {
    invisible?: boolean;
    style?: React.CSSProperties;
}>;
declare const SkeletonButton: React.FC<SkeletonBaseProps>;
declare const SkeletonContainer: React.FC<SkeletonContainer>;
declare const SelectSkeletonLoader: React.FC<SkeletonLoaderProps>;
export { Skeleton, SkeletonAvatar, SkeletonText, SkeletonButton, SkeletonContainer, SelectSkeletonLoader };
export { default as Loader } from "./Loader";
//# sourceMappingURL=index.d.ts.map