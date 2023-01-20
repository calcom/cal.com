import { ShellSubHeading } from "../layout";
import Meta from "../meta/Meta";
import { SkeletonText } from "../skeleton";

export function SkeletonLoader({
  className,
  title,
  description,
}: {
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <>
      <ShellSubHeading title={<div className="h-6 w-32 bg-gray-100" />} {...{ className }} />
      {title && description && <Meta title={title} description={description} />}

      <ul className="-mx-4 animate-pulse divide-y divide-neutral-200 rounded-md border border-gray-200 bg-white sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </>
  );
}

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between p-3">
      <div className="flex-grow truncate text-sm">
        <div className="flex justify-start space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-10 w-10" />
          <div className="space-y-2">
            <SkeletonText className="h-4 w-32" />
            <SkeletonText className="h-4 w-16" />
          </div>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-11 w-32" />
        </div>
      </div>
    </li>
  );
}
