import { SkeletonAvatar, SkeletonContainer, SkeletonText } from "@calcom/ui";
import { FiClock, FiUser } from "@calcom/ui/components/icon";

function SkeletonLoader() {
  return (
    <SkeletonContainer>
      <div className="mb-4 flex items-center">
        <SkeletonAvatar className="h-8 w-8" />
        <div className="flex flex-col space-y-1">
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="h-4 w-24" />
        </div>
      </div>
      <ul className="border-subtle bg-default divide-subtle divide-y rounded-md border sm:mx-0 sm:overflow-hidden">
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
          <SkeletonText className="h-5 w-32" />
        </div>
        <div className="">
          <ul className="mt-2 flex space-x-4 rtl:space-x-reverse ">
            <li className="flex items-center whitespace-nowrap">
              <FiClock className="text-subtle mt-0.5 mr-1.5 inline h-4 w-4" />
              <SkeletonText className="h-4 w-12" />
            </li>
            <li className="flex items-center whitespace-nowrap">
              <FiUser className="text-subtle mt-0.5 mr-1.5 inline h-4 w-4" />
              <SkeletonText className="h-4 w-12" />
            </li>
          </ul>
        </div>
      </div>
    </li>
  );
}
