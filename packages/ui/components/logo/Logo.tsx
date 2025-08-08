import classNames from "@calcom/ui/classNames";

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
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {icon ? (
          <div className="flex items-center justify-start space-x-2">
            <img className="h-8 w-8 dark:invert" alt="Cal ID" title="Cal ID" src={`${src}?type=icon`} />
            <span className="hidden text-xl lg:flex">Cal ID</span>
          </div>
        ) : (
          <img
            className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "dark:invert")}
            alt="Cal ID"
            title="Cal ID"
            src={src}
          />
        )}
      </strong>
    </h3>
  );
}
