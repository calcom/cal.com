import { cn } from "@coss/ui/lib/utils";

function FieldGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-6 md:grid-cols-2", className)}
      {...props}
    />
  );
}

function FieldGridRow({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("col-span-full", className)} {...props} />;
}

export { FieldGrid, FieldGridRow };
