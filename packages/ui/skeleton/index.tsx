import classNames from "@calcom/lib/classNames";

type SkeletonBaseProps = {
  width: string;
  height: string;
  className?: string;
};

interface AvatarProps extends SkeletonBaseProps {
  // Limit this cause we don't use avatars bigger than thi
  width: "2" | "3" | "4" | "5" | "6" | "8" | "12";
  height: "2" | "3" | "4" | "5" | "6" | "8" | "12";
}

interface SkeletonContainer {
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
}

const SkeletonAvatar: React.FC<AvatarProps> = ({ width, height, className }) => {
  return (
    <div
      className={classNames(
        `mt-1 rounded-full bg-gray-200 ltr:mr-2 rtl:ml-2 w-${width} h-${height}`,
        className
      )}
    />
  );
};

const SkeletonText: React.FC<SkeletonBaseProps> = ({ width, height, className }) => {
  return (
    <div
      className={classNames(
        `dark:white-300 animate-pulse rounded-md bg-gray-300 dark:bg-gray-300/50 w-${width} h-${height}`,
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
