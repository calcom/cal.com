import classNames from "@calcom/ui/classNames";

function getHashedLogoUrl(type: string): string {
  try {
    // biome-ignore lint/correctness/noProcessGlobal: Next.js inlines NEXT_PUBLIC_ env vars at compile time via the global process object
    const hashes = JSON.parse(process.env.NEXT_PUBLIC_LOGO_HASHES || "{}") as Record<string, string>;
    const hash = hashes[type];
    if (hash) {
      return `/api/logo?type=${type}&v=${hash}`;
    }
  } catch {
    // Fall through to unhashed URL
  }
  return `/api/logo?type=${type}`;
}

export function Logo({
  small,
  icon,
  inline = true,
  className,
  src,
  iconSrc,
}: {
  small?: boolean;
  icon?: boolean;
  inline?: boolean;
  className?: string;
  src?: string;
  iconSrc?: string;
}) {
  const resolvedSrc = src || getHashedLogoUrl("logo");
  const resolvedIconSrc = iconSrc || getHashedLogoUrl("icon");

  return (
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {icon ? (
          <img className="mx-auto w-9 dark:invert" alt="Cal" title="Cal" src={resolvedIconSrc} />
        ) : (
          <img
            className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "dark:invert")}
            alt="Cal"
            title="Cal"
            src={resolvedSrc}
          />
        )}
      </strong>
    </h3>
  );
}
