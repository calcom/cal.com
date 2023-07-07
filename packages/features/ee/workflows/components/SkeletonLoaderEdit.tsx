import { SkeletonContainer, SkeletonText } from "@calcom/ui";

function SkeletonLoader() {
  return (
    <SkeletonContainer>
      <div className="ml-2 mt-10 md:flex">
        <div className="mr-6 flex flex-col md:flex-none">
          <SkeletonText className="h-4 w-28" />
          <SkeletonText className="mb-6 mt-2 h-8 w-full md:w-64" />
          <SkeletonText className="h-4 w-28" />
          <SkeletonText className="mt-2 h-8 w-full md:w-64" />
          <SkeletonText className="mt-8 hidden h-0.5 w-full md:block" />
          <SkeletonText className="mb-6 mt-8 h-8 w-40" />
        </div>
        <div className="hidden flex-grow md:flex">
          <SkeletonText className="h-64 w-full" />
        </div>
      </div>
    </SkeletonContainer>
  );
}

export default SkeletonLoader;
