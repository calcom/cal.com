import React from "react";

import { SkeletonText } from "@calcom/ui";

function SkeletonLoader() {
  return (
    <ul className="divide-subtle border-subtle bg-default animate-pulse divide-y rounded-md border sm:overflow-hidden">
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
    </ul>
  );
}

export default SkeletonLoader;

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between px-4 py-4 sm:px-6">
      <div className="flex-grow truncate text-sm">
        <div className="flex">
          <div className="flex flex-col space-y-2">
            <SkeletonText className="h-5 w-16" />
            <SkeletonText className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-6 w-16" />
          <SkeletonText className="h-6 w-32" />
        </div>
      </div>
    </li>
  );
}
