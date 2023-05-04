import classNames from "@calcom/lib/classNames";
import { WEBAPP_PREFIX_PATH } from "@calcom/lib/constants";

export default function Logo({
  small,
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
          <img
            className="mx-auto w-9 dark:invert"
            alt="Cal"
            title="Cal"
            src={`${WEBAPP_PREFIX_PATH}/api/logo?type=icon`}
          />
        ) : (
          <img
            className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "dark:invert")}
            alt="Cal"
            title="Cal"
            src={`${WEBAPP_PREFIX_PATH}/api/logo`}
          />
        )}
      </strong>
    </h3>
  );
}
