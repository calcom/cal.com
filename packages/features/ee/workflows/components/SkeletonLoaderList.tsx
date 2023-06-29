import { SkeletonText } from "@calcom/ui";
import { Bell, Link as LinkIcon } from "@calcom/ui/components/icon";

function SkeletonLoader() {
  return (
    <ul className="divide-subtle border-subtle bg-default animate-pulse divide-y  rounded-md border sm:overflow-hidden">
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
            <SkeletonText className="h-4 w-16 sm:w-24" />
            <div className="flex">
              <Bell className="mr-1.5 mt-0.5 inline h-4 w-4 text-gray-200" />
              <SkeletonText className="h-4 w-16 ltr:mr-2 rtl:ml-2 sm:w-28" />
              <LinkIcon className="mr-1.5 mt-0.5 inline h-4 w-4 text-gray-200" />
              <SkeletonText className="h-4 w-28 sm:w-36" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-0 flex flex-shrink-0 sm:ml-5">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-8 w-8 sm:w-16" />
        </div>
      </div>
    </li>
  );
}
