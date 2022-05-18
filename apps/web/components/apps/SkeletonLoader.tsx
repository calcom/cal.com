import React from "react";

import { SkeletonText } from "@calcom/ui";

import { ShellSubHeading } from "@components/Shell";

function SkeletonLoader() {
  return (
    <>
      <ShellSubHeading title={<div className="h-6 w-32 rounded-sm bg-gray-100"></div>} />
      <ul className="-mx-4 animate-pulse divide-y divide-neutral-200 rounded-sm border border-gray-200 bg-white sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </>
  );
}

export default SkeletonLoader;

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between p-3">
      <div className="flex-grow truncate text-sm">
        <div className="flex justify-start space-x-2">
          <SkeletonText width="10" height="10"></SkeletonText>
          <div className="space-y-2">
            <SkeletonText height="4" width="32"></SkeletonText>
            <SkeletonText height="4" width="16"></SkeletonText>
          </div>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText width="32" height="11"></SkeletonText>
        </div>
      </div>
    </li>
  );
}
