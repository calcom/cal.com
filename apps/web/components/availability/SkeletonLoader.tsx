import React from "react";

function SkeletonLoader() {
  return (
    <ul className="animate-pulse divide-y divide-neutral-200 border border-gray-200 bg-white sm:mx-0 sm:overflow-hidden">
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
          <div className="h-4 w-32 rounded-md bg-gray-100"></div>
          <div className="h-2 w-32 rounded-md bg-gray-100"></div>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <div className="h-6 w-12 rounded-md bg-gray-100"></div>
        </div>
      </div>
    </li>
  );
}
