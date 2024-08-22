import { usePathname } from "next/navigation";

import classNames from "@calcom/lib/classNames";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";

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

  console.log("isMobile", isMobile);

  const logoStyle = { width: isMobile ? "230px" : "300px", height: "auto" };

  return (
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {icon ? (
          <img className="mx-auto w-9 dark:invert" alt="Cal" title="Cal" src={`${src}?type=icon`} />
        ) : (
          <img
            className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "dark:invert")}
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
