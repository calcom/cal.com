import { SkeletonAvatar, SkeletonContainer, SkeletonText } from "@calcom/ui";
import { Icon } from "@calcom/ui/Icon";

function SkeletonLoader() {
  return (
    <SkeletonContainer>
      <div className="mb-4 flex items-center">
        <SkeletonAvatar className="h-8 w-8" />
        <div className="space-y-1">
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="h-4 w-24" />
        </div>
      </div>
      <ul className="divide-y divide-neutral-200 border border-gray-200 bg-white sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </SkeletonContainer>
  );
}

export default SkeletonLoader;

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between px-4 py-4 sm:px-6">
      <div className="flex-grow truncate text-sm">
        <div>
          <SkeletonText width="32" height="5" />
        </div>
        <div className="">
          <ul className="mt-2 flex space-x-4 rtl:space-x-reverse ">
            <li className="flex items-center whitespace-nowrap">
              <Icon.FiClock className="mt-0.5 mr-1.5 inline h-4 w-4 text-gray-200" />
              <SkeletonText width="12" height="4" />
            </li>
            <li className="flex items-center whitespace-nowrap">
              <Icon.FiUser className="mt-0.5 mr-1.5 inline h-4 w-4 text-gray-200" />
              <SkeletonText width="16" height="4" />
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 sm:flex">
        <div className="flex justify-between rtl:space-x-reverse">
          <div className="cursor-pointer appearance-none rounded-sm border border-transparent p-2 text-neutral-500 hover:border-gray-300 hover:text-neutral-900">
            <Icon.FiExternalLink className="h-5 w-5" />
          </div>
          <div className="cursor-pointer appearance-none rounded-sm border border-transparent p-2 text-neutral-500 hover:border-gray-300 hover:text-neutral-900">
            <Icon.FiLink className="h-5 w-5" />
          </div>
          <div className="cursor-pointer appearance-none rounded-sm border border-transparent p-2 text-neutral-500 hover:border-gray-300 hover:text-neutral-900">
            <Icon.FiMoreHorizontal className="h-5 w-5" />
          </div>
        </div>
      </div>
    </li>
  );
}
