import { SkeletonText } from "@calcom/ui/components/skeleton";

export const FormSkeleton = () => (
  <div className="flex flex-col">
    <SkeletonText className="h-7 w-32" />
    <SkeletonText className="mt-2 h-7 w-full" />
    <SkeletonText className="mt-4 h-7 w-28" />
    <SkeletonText className="mt-2 h-7 w-full" />

    <div className="mt-12 flex h-7 w-full flex-row items-center gap-4">
      <SkeletonText className="inline h-4 w-4 rounded-full" />
      <SkeletonText className="inline h-7 w-32" />
    </div>
    <div className="mt-2 flex h-7 w-full flex-row items-center gap-4">
      <SkeletonText className="inline h-4 w-4 rounded-full" />
      <SkeletonText className="inline h-7 w-28" />
    </div>

    <SkeletonText className="mt-8 h-7 w-32" />
    <SkeletonText className="mt-2 h-7 w-full" />
    <SkeletonText className="mt-4 h-7 w-28" />
    <SkeletonText className="mt-2 h-7 w-full" />

    <div className="mt-6 flex flex-row gap-3">
      <SkeletonText className="ml-auto h-8 w-20" />
      <SkeletonText className="h-8 w-20" />
    </div>
  </div>
);
