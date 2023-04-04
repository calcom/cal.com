import React from "react";

import { Button, SkeletonText } from "@calcom/ui";
import { FiMoreHorizontal } from "@calcom/ui/components/icon";

import classNames from "@lib/classNames";

function SkeletonLoader() {
  return (
    <ul className="divide-subtle border-subtle bg-default animate-pulse divide-y rounded-md border sm:mx-0 sm:overflow-hidden">
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
    </ul>
  );
}

export default SkeletonLoader;

function SkeletonItem() {
  return (
    <li>
      <div className="flex items-center justify-between py-5 hover:bg-neutral-50 ltr:pl-4 rtl:pr-4 sm:ltr:pl-0 sm:rtl:pr-0">
        <div className="items-between flex w-full flex-col justify-center hover:bg-neutral-50 sm:px-6">
          <SkeletonText className="my-1 h-4 w-32" />
          <SkeletonText className="my-1 h-2 w-24" />
          <SkeletonText className="my-1 h-2 w-40" />
        </div>
        <Button
          className="mx-5"
          type="button"
          variant="icon"
          color="secondary"
          StartIcon={FiMoreHorizontal}
          disabled
        />
      </div>
    </li>
  );
}

export const SelectSkeletonLoader = ({ className }: { className?: string }) => {
  return (
    <li
      className={classNames(
        "border-subtle group flex w-full items-center justify-between rounded-sm border px-[10px] py-3",
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
