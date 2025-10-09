import { cn } from "@calid/features/lib/cn";

export function Logo({
  small,
  icon,
  inline = true,
  className,
  src = "/api/logo",
}: {
  small?: boolean;
  icon?: boolean;
  inline?: boolean;
  className?: string;
  src?: string;
}) {
  return (
    <h3 className={cn("logo", inline && "inline", className)}>
      {icon ? (
        <div className="flex items-center justify-center space-x-2 md:justify-start">
          <img className="md:h-6 w-20 dark:invert" alt="Cal ID" title="Cal ID" src={`${src}?type=icon`} />
        </div>
      ) : (
        <img
          className={cn(small ? "h-4 w-auto" : "h-5 w-auto", "dark:invert")}
          alt="Cal ID"
          title="Cal ID"
          src={src}
        />
      )}
    </h3>
  );
}
