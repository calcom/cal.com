import React from "react";

import { SkeletonText } from "@calcom/ui";

import classNames from "@lib/classNames";

function SkeletonLoader() {
  return (
    <ul className="animate-pulse divide-y divide-gray-200 rounded-md border border-gray-200 bg-white sm:mx-0 sm:overflow-hidden">
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
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="h-2 w-32" />
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-6 w-12" />
        </div>
      </div>
    </li>
  );
}

export const SelectSkeletonLoader = ({ className }: { className?: string }) => {
  return (
    <li
      className={classNames(
        "group flex w-full items-center justify-between rounded-sm border border-gray-200 px-[10px] py-3",
        className
      )}>
      <div className="flex-grow truncate text-sm">
        <div className="flex justify-between">
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="h-4 w-4" />
        </div>
      </div>
    </li>
  );
};
