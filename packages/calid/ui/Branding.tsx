import Link from "next/link";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export const Branding = ({
  showLogo = true,
  showText = true,
  variant = "default",
  size = "sm",
  faviconUrl,
}: {
  showLogo?: boolean;
  showText?: boolean;
  variant?: "default" | "minimal" | "prominent";
  size?: "xs" | "sm" | "md";
  faviconUrl?: string | null;
}) => {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();

  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
  };

  const variantClasses = {
    default: "text-subtle hover:text-emphasis transition-colors",
    minimal: "text-muted opacity-60 hover:opacity-100 transition-opacity",
    prominent: "text-emphasis font-medium hover:text-brand transition-colors",
  };

  const containerClasses = {
    default: `p-3 text-center ${isEmbed ? "max-w-4xl" : ""}`,
    minimal: `p-1 text-right ${isEmbed ? "max-w-2xl" : ""}`,
    prominent: `p-4 text-center bg-subtle rounded-lg ${isEmbed ? "max-w-5xl" : ""}`,
  };

  return (
    <div className={containerClasses[variant]}>
      <div className={`${sizeClasses[size]} ${variantClasses[variant]}`}>
        {showLogo && (
          <img
            className={`inline h-auto dark:invert ${
              size === "xs" ? "h-[8px]" : 
              size === "sm" ? "h-[12px]" : 
              "h-[16px]"
            }`}
            src={faviconUrl || `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/logo`}
            alt={`${APP_NAME} Logo`}
          />
        )}
        {!showLogo && showText && (
          <span className="font-medium">{APP_NAME}</span>
        )}
      </div>
    </div>
  );
};