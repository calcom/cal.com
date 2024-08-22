import classNames from "@calcom/lib/classNames";

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
  const isLogin = window.location.pathname.includes("auth/login");
  const isMobile = window.innerWidth < 640;

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
