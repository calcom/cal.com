import { useIsMobile } from "@calid/features/hooks";
import { cn } from "@calid/features/lib/cn";
import { ProBadge } from "@calid/features/modules/claim-pro/ProBadge";

import { useMeQuery } from "@calcom/trpc/react/hooks/useMeQuery";

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
  const { data: user } = useMeQuery();
  const isMobile = useIsMobile();

  return (
    <h3 className={cn("logo", inline && "inline", className)}>
      <div>
        {icon ? (
          <>
            <div className="relative flex items-center justify-center">
              <img className="h-8 w-8 lg:hidden" alt="Cal ID" title="Cal ID" src="/calid_favicon.svg" />
              <span className="absolute bottom-6 left-6 text-[10px] font-bold text-blue-500 lg:hidden">
                Pro
              </span>
            </div>
            <div className="flex items-center justify-start">
              <img
                className="hidden h-6 w-20 lg:block dark:invert"
                alt="Cal ID"
                title="Cal ID"
                src={`${src}?type=icon`}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <img
              className={cn(small ? "h-4 w-auto" : "h-5 w-auto", "dark:invert")}
              alt="Cal ID"
              title="Cal ID"
              src={src}
            />
            {isMobile &&
              user?.metadata?.isProUser?.yearClaimed > 0 &&
              user?.metadata?.isProUser?.verified && (
                <ProBadge
                  isMobile={isMobile}
                  yearClaimed={user.metadata.isProUser.yearClaimed}
                  validTillDate={user.metadata.isProUser.validTillDate}
                />
              )}
          </div>
        )}
      </div>
    </h3>
  );
}
