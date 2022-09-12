import React from "react";

import { SkeletonText } from "@calcom/ui";

function SkeletonLoader() {
  return (
    <ul className="animate-pulse divide-y divide-neutral-200 rounded-md border border-gray-200 bg-white sm:mx-0 sm:overflow-hidden">
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
    </ul>
  );
}

export default SkeletonLoader;

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between px-2 py-[23px] sm:px-6">
      <div className="flex-grow truncate text-sm">
        <div className="flex flex-col space-y-2">
          <SkeletonText width="32" height="4" />
          <SkeletonText width="32" height="2" />
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText width="12" height="6" />
        </div>
      </div>
    </li>
  );
}

export const AvailabilitySelectSkeletonLoader = () => {
  return (
    <li className="group flex w-full items-center justify-between rounded-sm border border-gray-200 px-[10px] py-3">
      <div className="flex-grow truncate text-sm">
        <div className="flex justify-between">
          <SkeletonText width="32" height="4" />
          <SkeletonText width="4" height="4" />
        </div>
      </div>
    </li>
  );
};
