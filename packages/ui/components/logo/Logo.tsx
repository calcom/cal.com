import { useSubdomainContext } from "@calcom/features/orgs/SubdomainProvider";
import classNames from "@calcom/lib/classNames";
import { LOGO_ICON, LOGO } from "@calcom/lib/constants";

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
  const { isSubdomain, logoSrc, subdomain } = useSubdomainContext();
  return (
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {isSubdomain && (
          <img
            className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "dark:invert")}
            alt={subdomain || "Cal"}
            title={subdomain || "Cal"}
            src={logoSrc ?? LOGO}
          />
        )}
        {!isSubdomain &&
          (icon ? (
            <img className="mx-auto w-9 dark:invert" alt="Cal" title="Cal" src={LOGO_ICON} />
          ) : (
            <img
              className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "dark:invert")}
              alt="Cal"
              title="Cal"
              src={LOGO}
            />
          ))}
      </strong>
    </h3>
  );
}
