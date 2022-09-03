import React from "react";

import { SkeletonText } from "@calcom/ui";

function SkeletonLoader() {
  return (
    <ul className="mx-6 mt-6 animate-pulse divide-y divide-neutral-200 border border-gray-200 bg-white sm:overflow-hidden">
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
    </ul>
  );
}

export default SkeletonLoader;

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between px-2 py-4 sm:px-6">
      <div className="flex-grow truncate text-sm">
        <div className="flex">
          <div className="flex flex-col space-y-2">
            <SkeletonText width="16" height="5" />
            <SkeletonText width="32" height="4" />
          </div>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText width="16" height="6" />
          <SkeletonText width="32" height="6" />
        </div>
      </div>
    </li>
  );
}
