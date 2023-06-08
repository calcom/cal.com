import type { ReactNode, InputHTMLAttributes } from "react";
import { forwardRef } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
};

export const FilterCheckboxField = forwardRef<HTMLInputElement, Props>(({ label, icon, ...rest }, ref) => {
  return (
    <div className="hover:bg-muted flex items-center py-2 pl-3 pr-2.5 hover:cursor-pointer">
      <label className="flex w-full items-center justify-between hover:cursor-pointer">
        <div className="flex items-center">
          <div className="text-default flex h-4 w-4 items-center justify-center ltr:mr-2 rtl:ml-2">
            {icon}
          </div>
          <span className="text-sm">{label}</span>
        </div>
        <div className="flex h-5 items-center">
          <input
            {...rest}
            ref={ref}
            type="checkbox"
            className="text-primary-600 focus:ring-primary-500 border-default bg-default h-4 w-4 rounded hover:cursor-pointer"
          />
        </div>
      </label>
    </div>
  );
});

export const FilterCheckboxFieldsContainer = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col gap-0.5 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1">{children}</div>;
};

FilterCheckboxField.displayName = "FilterCheckboxField";
