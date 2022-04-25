import React from "react";

function SkeletonLoader() {
  return (
    <ul className="animate-pulse divide-y divide-neutral-200 border border-gray-200 bg-white ">
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
    </ul>
  );
}

export default SkeletonLoader;

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between px-2 py-6 sm:px-6">
      <a className="flex-grow truncate text-sm" title="Google Meet " href="/event-types/9">
        <div className="flex flex-col justify-start">
          <div className="h-6 w-32 rounded-md bg-gray-300"></div>
        </div>
      </a>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <div className="h-6 w-12 rounded-md bg-gray-300"></div>
        </div>
      </div>
    </li>
  );
}
