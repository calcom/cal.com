import { SkeletonText } from "@calcom/ui/components/skeleton";

export default function WorkFlowFormSkeleton() {
  return (
    <div className="min-w-80 bg-default border-subtle w-full space-y-6 rounded-md border p-7">
      <div className="flex items-center gap-4">
        <SkeletonText className="w-6 rounded-full" />
        <div className="flex w-full flex-col gap-2">
          <SkeletonText className="w-28" />
          <SkeletonText className="w-40" />
        </div>
      </div>
      <div className="border-subtle border-t" />
      {Array.from({ length: 2 }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <SkeletonText className="w-28" />
          <SkeletonText className="w-full" />
        </div>
      ))}
      <SkeletonText className="w-full" />
    </div>
  );
}
