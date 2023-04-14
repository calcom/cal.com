import { useSubdomainContext } from "@calcom/features/orgs/SubdomainProvider";
import { classNames } from "@calcom/lib";
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
  const { isSubdomain, logoSrc } = useSubdomainContext();
  return (
    <h3 className={classNames("logo dark:invert", inline && "inline", className)}>
      <strong>
        {isSubdomain && (
          <img className={small ? "h-4 w-auto" : "h-5 w-auto"} alt="Cal" title="Cal" src={logoSrc} />
        )}
        {!isSubdomain &&
          (icon ? (
            <img className="mx-auto w-9" alt="Cal" title="Cal" src={LOGO_ICON} />
          ) : (
            <img className={small ? "h-4 w-auto" : "h-5 w-auto"} alt="Cal" title="Cal" src={LOGO} />
          ))}
      </strong>
    </h3>
  );
}
