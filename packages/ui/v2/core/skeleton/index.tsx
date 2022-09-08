import classNames from "@calcom/lib/classNames";

type SkeletonBaseProps = {
  /** @deprecated @see https://tailwindcss.com/docs/content-configuration#dynamic-class-names */
  width?: string;
  /** @deprecated @see https://tailwindcss.com/docs/content-configuration#dynamic-class-names */
  height?: string;
  className?: string;
};

interface AvatarProps extends SkeletonBaseProps {
  // Limit this cause we don't use avatars bigger than this
  /** @deprecated @see https://tailwindcss.com/docs/content-configuration#dynamic-class-names */
  width?: "2" | "3" | "4" | "5" | "6" | "8" | "12";
  /** @deprecated @see https://tailwindcss.com/docs/content-configuration#dynamic-class-names */
  height?: "2" | "3" | "4" | "5" | "6" | "8" | "12";
}

interface SkeletonContainer {
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
}

const SkeletonAvatar: React.FC<AvatarProps> = ({ width, height, className }) => {
  className = width ? `${className} w-${width}` : className;
  // Using h-[number] wasn't working for some reason, using line-height instead
  className = height ? `${className} h[${height}px]` : className;
  return <div className={classNames(`mt-1 rounded-full bg-gray-200 ltr:mr-2 rtl:ml-2`, className)} />;
};

const SkeletonText: React.FC<SkeletonBaseProps> = ({ width = "", height = "", className = "" }) => {
  /** @see https://tailwindcss.com/docs/content-configuration#dynamic-class-names */
  className = width ? `${className} w-${width}` : className;
  // Using h-[number] wasn't working for some reason, using line-height instead
  className = height ? `${className} leading-[${height}px]` : className;
  return (
    <span
      className={classNames(
        `font-size-0 dark:white-300 animate-pulse rounded-md bg-gray-300 empty:before:inline-block empty:before:content-['']`,
        className
      )}
    />
  );
};

const SkeletonButton: React.FC<SkeletonBaseProps> = ({ width, height, className }) => {
  return (
    <SkeletonContainer>
      <div className={classNames(`w-${width} h-${height} bg-gray-200`, className)} />
    </SkeletonContainer>
  );
};

const SkeletonContainer: React.FC<SkeletonContainer> = ({ children, as, className }) => {
  const Component = as || "div";
  return <Component className={classNames("animate-pulse", className)}>{children}</Component>;
};

export { SkeletonAvatar, SkeletonText, SkeletonButton, SkeletonContainer };
