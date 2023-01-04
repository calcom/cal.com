import { SkeletonText, SkeletonButton } from "@calcom/ui";

export default function RecordingListItemSkeleton() {
  return (
    <div className="flex w-full justify-between rounded-md border p-2">
      <div>
        <p className="pt-2 text-sm font-medium text-gray-900">
          <SkeletonText className="h-3 w-56" />
        </p>
        <div className="mt-1 w-max">
          <SkeletonText className="h-3 w-28" />
        </div>
      </div>
      <div className="flex items-center">
        <SkeletonButton className="h-5 w-28 rounded-md px-4 py-4" />
      </div>
    </div>
  );
}
