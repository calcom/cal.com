import { SkeletonAvatar, SkeletonContainer, SkeletonText } from "@calcom/ui";
import { Icon } from "@calcom/ui/Icon";

function SkeletonLoader() {
  return (
    <SkeletonContainer>
      <div className="mt-20 flex">
        <div className="mr-6 flex-none">
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="mt-2 mb-6 h-8 w-64" />
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="mt-2 h-8 w-64" />
          <div className="my-7 border-transparent md:border-t md:border-gray-200" />
          <SkeletonText className="mt-2 mb-6 h-8 w-40" />
        </div>
        <div className="flex-grow">
          <SkeletonText className="h-64 w-full" />
        </div>
      </div>
    </SkeletonContainer>
  );
}

export default SkeletonLoader;
