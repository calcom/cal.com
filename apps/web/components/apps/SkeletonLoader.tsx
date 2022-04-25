import React from "react";

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
          <div className="h-10 w-10 rounded-lg bg-gray-100"></div>
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-md bg-gray-100"></div>
            <div className="h-4 w-16 rounded-md bg-gray-100"></div>
          </div>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <div className="h-11 w-32 rounded-md bg-gray-100"></div>
        </div>
      </div>
    </li>
  );
}
