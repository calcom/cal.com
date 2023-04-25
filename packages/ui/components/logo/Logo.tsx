import classNames from "@calcom/lib/classNames";

export default function Logo({
  // small,
  icon,
  inline = true,
  className,
}: {
  small?: boolean;
  icon?: boolean;
  inline?: boolean;
  className?: string;
}) {
  return (
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {icon ? (
          <img className="mx-auto w-9 dark:invert" alt="Cal" title="Cal" src="/api/logo?icon=1" />
        ) : (
          <img className="w-auto" alt="Cal" title="Cal" src="/api/logo" />
        )}
      </strong>
    </h3>
  );
}
