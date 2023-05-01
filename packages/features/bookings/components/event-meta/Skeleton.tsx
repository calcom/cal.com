import classNames from "@calcom/lib/classNames";
import { SkeletonText } from "@calcom/ui";

export const EventMetaSkeleton = () => (
  <div className="flex flex-col">
    <SkeletonText className="h-6 w-6 rounded-full" />
    <SkeletonText className="mt-2 h-5 w-32" />
    <SkeletonText className="mt-2 h-8 w-48" />

    <div className="mt-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="mb-2 flex flex-row items-center" key={i}>
          <SkeletonText className="mr-3 h-5 w-5 rounded-full" />
          <SkeletonText className={classNames("h-6", i > 1 ? "w-24" : "w-32")} />
        </div>
      ))}
    </div>
  </div>
);
