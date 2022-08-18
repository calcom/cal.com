import { classNames } from "@calcom/lib";
import { Icon } from "@calcom/ui/Icon";

import Divider from "../Divider";

export default function FormCard({ children, label, deleteField, className, ...props }) {
  className = classNames(className, "w-full rounded-md p-4 border border-gray-200");

  return (
    <div className={className} {...props}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold leading-none">{label}</span>
        {deleteField.check() ? (
          <button
            onClick={() => {
              deleteField.fn();
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
