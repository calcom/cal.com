import { useMemo } from "react";

import { LOGO_ICON, LOGO } from "@calcom/lib/constants";

const DOMAIN_LOGO_MAP = {
  archimed: {
    logo: "https://www.archimed.group/wp-content/uploads/2022/09/archimed-logo.svg",
    name: "Archimed",
  },
};

export default function Logo({ small, icon }: { small?: boolean; icon?: boolean }) {
  const domainLogo = useMemo(() => {
    const hostname =
      typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "";
    const domain = hostname.split(".").slice(-2).join(".") as keyof typeof DOMAIN_LOGO_MAP;
    return DOMAIN_LOGO_MAP[domain];
  }, []);

  if (domainLogo) {
    return (
      <h3 className="logo inline dark:invert">
        <strong>
          <img className="mx-auto w-9" alt={domainLogo.name} title={domainLogo.name} src={domainLogo.logo} />
        </strong>
      </h3>
    );
  }

  return (
    <h3 className="logo inline dark:invert">
      <strong>
        {icon ? (
          <img className="mx-auto w-9" alt="Cal" title="Cal" src={LOGO_ICON} />
        ) : (
          <img className={small ? "h-4 w-auto" : "h-5 w-auto"} alt="Cal" title="Cal" src={LOGO} />
        )}
      </strong>
    </h3>
  );
}
