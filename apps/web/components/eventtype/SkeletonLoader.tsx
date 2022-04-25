import { LinkIcon } from "@heroicons/react/outline";
import { ClockIcon, DotsHorizontalIcon, ExternalLinkIcon, UserIcon } from "@heroicons/react/solid";
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
    <li className="group flex w-full items-center justify-between px-4 py-4 sm:px-6">
      <div className="flex-grow truncate text-sm">
        <div>
          <div className="h-5 w-32 rounded-md bg-gray-100"></div>
        </div>
        <div className="text-neutral-500 dark:text-white">
          <ul className="mt-2 flex space-x-4 rtl:space-x-reverse ">
            <li className="flex items-center whitespace-nowrap">
              <ClockIcon className="mt-0.5 mr-1.5 inline h-4 w-4 text-gray-200"></ClockIcon>
              <div className="h-4 w-12 rounded-md bg-gray-100"></div>
            </li>
            <li className="flex items-center whitespace-nowrap">
              <UserIcon className="mt-0.5 mr-1.5 inline h-4 w-4 text-gray-200"></UserIcon>
              <div className="h-4 w-16 rounded-md bg-gray-100"></div>
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 sm:flex">
        <div className="flex justify-between rtl:space-x-reverse">
          <div className="btn-icon appearance-none">
            <ExternalLinkIcon className="h-5 w-5" />
          </div>
          <div className="btn-icon appearance-none">
            <LinkIcon className="h-5 w-5" />
          </div>
          <div className="btn-icon appearance-none">
            <DotsHorizontalIcon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </li>
  );
}
