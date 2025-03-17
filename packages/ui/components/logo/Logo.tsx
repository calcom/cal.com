import { usePathname } from "next/navigation";

import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import classNames from "@calcom/ui/classNames";

export default function Logo({
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
  const isMobile = useMediaQuery("(max-width: 640px)");
  const pathname = usePathname();
  const isLogin = (pathname || "").includes("auth/login");

  const logoStyle = { width: isMobile ? "230px" : "300px", height: "auto" };

  return (
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {icon ? (
          <img className="mx-auto w-9 dark:invert" alt="Cal" title="Cal" src={`${src}?type=icon`} />
        ) : (
          <img
            className={classNames(small ? "h-[94px] w-auto" : "h-5 h-[94px] w-auto", "dark:invert")}
            alt="Cal"
            title="Cal"
            src={src}
            {...(isLogin && { style: logoStyle })}
          />
        )}
      </strong>
    </h3>
  );
}
