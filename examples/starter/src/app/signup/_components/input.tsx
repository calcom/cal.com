import { Input, type InputProps } from "~/components/ui/input";
import { type ReactNode } from "react";
import { cn } from "~/lib/utils";
export const AddonFieldPrefix = (props: { children?: ReactNode; prefix: string }) => {
  return (
      <div className="flex rounded-md shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring sm:max-w-md ring-1 ring-inset ring-input bg-muted focus-within:ring-offset-2 focus-within:outline-none">
        <span className="flex select-none items-center pl-3 sm:text-sm text-muted-foreground h-10 border-none">
          {props.prefix}
        </span>
        {props.children}
      </div>
  );
};
export const AddonFieldInput = (props: {className?: string;} & InputProps) => {
    const {className} = props;
    return (
        <Input {...props} className={cn("ring-0 ml-1 rounded-l-none focus:ring-0 focus-visible:ring-0 border-0 focus-visible:ring-inset ring-input focus-visible:outline-0", className)} />
    )
}
