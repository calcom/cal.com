import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

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

const SkeletonAvatar: React.FC<SkeletonBaseProps> = ({ className }) => {
  return <div className={classNames(`bg-emphasis me-3 mt-1 rounded-full`, className)} />;
};

type SkeletonProps<T> = {
  as: keyof JSX.IntrinsicElements | React.FC;
  className?: string;
  children: React.ReactNode;
  loading?: boolean;
  waitForTranslation?: boolean;
  loadingClassName?: string;
} & (T extends React.FC<infer P>
  ? P
  : T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T]
  : never);

const Skeleton = <T extends keyof JSX.IntrinsicElements | React.FC>({
  as,
  className = "",
  children,
  loading = false,
  /**
   * Assumes that the text needs translation by default and wait for it.
   */
  waitForTranslation = true,
  /**
   * Classes that you need only in loading state
   */
  loadingClassName = "",
  ...rest
}: SkeletonProps<T>) => {
  const { isLocaleReady } = useLocale();
  loading = (waitForTranslation ? !isLocaleReady : false) || loading;
  const Component = as;
  return (
    <Component
      className={classNames(
        loading
          ? classNames("font-size-0 bg-emphasis animate-pulse rounded-md text-transparent", loadingClassName)
          : "",
        className
      )}
      {...rest}>
      {children}
    </Component>
  );
};

const SkeletonText: React.FC<SkeletonBaseProps & { invisible?: boolean; style?: React.CSSProperties }> = ({
  className = "",
  invisible = false,
  style,
}) => {
  return (
    <span
      style={style}
      className={classNames(
        `font-size-0 bg-emphasis inline-block animate-pulse rounded-md empty:before:inline-block empty:before:content-['']`,
        className,
        invisible ? "invisible" : ""
      )}
    />
  );
};

const SkeletonButton: React.FC<SkeletonBaseProps> = ({ className }) => {
  return (
    <SkeletonContainer>
      <div className={classNames(`bg-emphasis rounded-md`, className)} />
    </SkeletonContainer>
  );
};

const SkeletonContainer: React.FC<SkeletonContainer> = ({ children, as, className }) => {
  const Component = as || "div";
  return <Component className={classNames("animate-pulse", className)}>{children}</Component>;
};

const SelectSkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className }) => {
  return (
    <li
      className={classNames(
        "border-subtle group flex w-full items-center justify-between rounded-sm border px-[10px] py-3",
        className
      )}>
      <div className="grow truncate text-sm">
        <div className="flex justify-between">
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="h-4 w-4" />
        </div>
      </div>
    </li>
  );
};

export { Skeleton, SkeletonAvatar, SkeletonText, SkeletonButton, SkeletonContainer, SelectSkeletonLoader };
