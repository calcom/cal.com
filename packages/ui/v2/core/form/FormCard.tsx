import { classNames } from "@calcom/lib";
import { Icon } from "@calcom/ui/Icon";

import Divider from "../Divider";

type Action = { check: () => boolean; fn: () => void };
export default function FormCard({
  children,
  label,
  deleteField,
  moveUp,
  moveDown,
  className,
  ...restProps
}: {
  children: React.ReactNode;
  label?: string;
  deleteField?: Action | null;
  moveUp?: Action | null;
  moveDown?: Action | null;
  className?: string;
} & JSX.IntrinsicElements["div"]) {
  className = classNames(className, "group relative w-full rounded-md p-4 border border-gray-200");

  return (
    <div className={className} {...restProps}>
      <div>
        {moveUp?.check() ? (
          <button
            type="button"
            className="invisible absolute left-0 -ml-[13px] -mt-0 mb-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:block"
            onClick={() => moveUp?.fn()}>
            <Icon.FiArrowUp />
          </button>
        ) : null}
        {moveDown?.check() ? (
          <button
            type="button"
            className="invisible absolute left-0 mt-8 -ml-[13px] hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:block"
            onClick={() => moveDown?.fn()}>
            <Icon.FiArrowDown />
          </button>
        ) : null}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold leading-none">{label}</span>
        {deleteField?.check() ? (
          <button
            onClick={() => {
              deleteField?.fn();
            }}
            color="secondary">
            <Icon.FiTrash className="h-4 w-4 text-gray-400" />
          </button>
        ) : null}
      </div>
      <Divider className="mt-3 mb-6" />
      {children}
    </div>
  );
}
