import { Icon } from "@calcom/ui";
import { SkeletonText } from "@calcom/ui/v2";

function SkeletonLoader() {
  return (
    <ul className="mt-20 animate-pulse divide-y divide-neutral-200 rounded-md border border-gray-200 bg-white sm:overflow-hidden">
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
            <SkeletonText className="h-4 w-28" />
            <div className="flex">
              <Icon.FiBell className="mt-0.5 mr-1.5 inline h-4 w-4 text-gray-200" />
              <SkeletonText className="mr-2 h-4 w-32" />
              <Icon.FiLink className="mt-0.5 mr-1.5 inline h-4 w-4 text-gray-200" />
              <SkeletonText className="h-4 w-40" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-8 w-16" />
        </div>
      </div>
    </li>
  );
}
