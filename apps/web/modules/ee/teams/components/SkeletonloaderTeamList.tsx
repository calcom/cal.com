"use client";

import { SkeletonText } from "@calcom/ui/components/skeleton";

function SkeletonLoaderTeamList() {
  return (
    <div className="w-full">
      <ul className="bg-default divide-subtle border-subtle divide-y overflow-hidden rounded-md border">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </div>
  );
}

export default SkeletonLoaderTeamList;

function SkeletonItem() {
  return (
    <li className="flex w-full items-center justify-between">
      <div className="flex items-center space-x-3 p-5 rtl:space-x-reverse">
        <SkeletonText className="h-8 w-8 rounded-full" />
        <div className="flex flex-col stack-y-2">
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="h-3 w-24" />
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-4 w-16" />
          <div className="flex space-x-2 rtl:space-x-reverse">
            <SkeletonText className="h-8 w-8 rounded" />
            <SkeletonText className="h-8 w-8 rounded" />
          </div>
        </div>
      </div>
    </li>
  );
}
